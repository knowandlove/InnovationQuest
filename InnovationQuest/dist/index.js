// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// server/storage.ts
var MemStorage = class {
  gameRooms;
  students;
  inventions;
  votes;
  currentIds;
  constructor() {
    this.gameRooms = /* @__PURE__ */ new Map();
    this.students = /* @__PURE__ */ new Map();
    this.inventions = /* @__PURE__ */ new Map();
    this.votes = /* @__PURE__ */ new Map();
    this.currentIds = {
      gameRooms: 1,
      students: 1,
      inventions: 1,
      votes: 1
    };
  }
  async createGameRoom(insertRoom) {
    const id = this.currentIds.gameRooms++;
    const room = {
      id,
      roomCode: insertRoom.roomCode,
      problem: insertRoom.problem || null,
      phase: insertRoom.phase || "setup",
      createdAt: /* @__PURE__ */ new Date()
    };
    this.gameRooms.set(room.roomCode, room);
    return room;
  }
  async getGameRoom(roomCode) {
    return this.gameRooms.get(roomCode);
  }
  async updateGameRoom(roomCode, updates) {
    const room = this.gameRooms.get(roomCode);
    if (!room) return void 0;
    const updatedRoom = { ...room, ...updates };
    this.gameRooms.set(roomCode, updatedRoom);
    return updatedRoom;
  }
  async addStudent(insertStudent) {
    const id = this.currentIds.students++;
    const student = {
      id,
      roomId: insertStudent.roomId,
      nickname: insertStudent.nickname,
      socketId: insertStudent.socketId || null,
      isConnected: insertStudent.isConnected ?? true
    };
    this.students.set(id, student);
    return student;
  }
  async getStudentsByRoom(roomId) {
    return Array.from(this.students.values()).filter(
      (student) => student.roomId === roomId
    );
  }
  async getStudentByNickname(roomId, nickname) {
    return Array.from(this.students.values()).find(
      (student) => student.roomId === roomId && student.nickname === nickname
    );
  }
  async updateStudent(id, updates) {
    const student = this.students.get(id);
    if (!student) return void 0;
    const updatedStudent = { ...student, ...updates };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }
  async removeStudent(id) {
    this.students.delete(id);
  }
  async addInvention(insertInvention) {
    const id = this.currentIds.inventions++;
    const invention = {
      ...insertInvention,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.inventions.set(id, invention);
    return invention;
  }
  async getInventionsByRoom(roomId) {
    return Array.from(this.inventions.values()).filter(
      (invention) => invention.roomId === roomId
    );
  }
  async getInventionById(id) {
    return this.inventions.get(id);
  }
  async addVote(insertVote) {
    const id = this.currentIds.votes++;
    const vote = {
      ...insertVote,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.votes.set(id, vote);
    return vote;
  }
  async getVotesByRoom(roomId) {
    return Array.from(this.votes.values()).filter(
      (vote) => vote.roomId === roomId
    );
  }
  async getVoteByStudent(roomId, studentId) {
    return Array.from(this.votes.values()).find(
      (vote) => vote.roomId === roomId && vote.studentId === studentId
    );
  }
  async getInventionsWithVotes(roomId) {
    const inventions = await this.getInventionsByRoom(roomId);
    const votes = await this.getVotesByRoom(roomId);
    const students = await this.getStudentsByRoom(roomId);
    return inventions.map((invention) => {
      const voteCount = votes.filter((vote) => vote.inventionId === invention.id).length;
      const student = students.find((s) => s.id === invention.studentId);
      return {
        ...invention,
        voteCount,
        studentNickname: student?.nickname || "Unknown"
      };
    }).sort((a, b) => b.voteCount - a.voteCount);
  }
};
var storage = new MemStorage();

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const roomConnections = /* @__PURE__ */ new Map();
  const teacherConnections = /* @__PURE__ */ new Map();
  function generateRoomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  function broadcastToRoom(roomCode, message, excludeWs) {
    const connections = roomConnections.get(roomCode);
    if (!connections) return;
    const messageStr = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
  function sendToTeacher(roomCode, message) {
    const teacherWs = teacherConnections.get(roomCode);
    if (teacherWs && teacherWs.readyState === WebSocket.OPEN) {
      teacherWs.send(JSON.stringify(message));
    }
  }
  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("Received message:", message.type);
        switch (message.type) {
          case "create_room": {
            const roomCode = generateRoomCode();
            await storage.createGameRoom({
              roomCode,
              phase: "setup",
              problem: null
            });
            ws.roomCode = roomCode;
            ws.isTeacher = true;
            teacherConnections.set(roomCode, ws);
            if (!roomConnections.has(roomCode)) {
              roomConnections.set(roomCode, /* @__PURE__ */ new Set());
            }
            roomConnections.get(roomCode).add(ws);
            ws.send(JSON.stringify({
              type: "room_created",
              data: { roomCode }
            }));
            break;
          }
          case "join_room": {
            const { roomCode, nickname } = message.data;
            const room = await storage.getGameRoom(roomCode);
            if (!room) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Room not found" }
              }));
              return;
            }
            const existingStudent = await storage.getStudentByNickname(room.id, nickname);
            if (existingStudent) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Nickname already taken" }
              }));
              return;
            }
            const student = await storage.addStudent({
              roomId: room.id,
              nickname,
              socketId: "ws-" + Date.now(),
              isConnected: true
            });
            ws.roomCode = roomCode;
            ws.studentId = student.id;
            if (!roomConnections.has(roomCode)) {
              roomConnections.set(roomCode, /* @__PURE__ */ new Set());
            }
            roomConnections.get(roomCode).add(ws);
            ws.send(JSON.stringify({
              type: "joined_room",
              data: {
                roomCode,
                studentId: student.id,
                currentPhase: room.phase,
                problem: room.problem
              }
            }));
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(roomCode, {
              type: "students_updated",
              data: { students }
            });
            break;
          }
          case "broadcast_problem": {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Only teachers can broadcast problems" }
              }));
              return;
            }
            const { problem } = message.data;
            await storage.updateGameRoom(ws.roomCode, {
              problem,
              phase: "invention"
            });
            broadcastToRoom(ws.roomCode, {
              type: "problem_broadcast",
              data: { problem }
            }, ws);
            ws.send(JSON.stringify({
              type: "problem_broadcast_success",
              data: { problem }
            }));
            break;
          }
          case "submit_invention": {
            if (!ws.studentId || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Invalid student session" }
              }));
              return;
            }
            const { name, tagline, description } = message.data;
            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;
            const invention = await storage.addInvention({
              roomId: room.id,
              studentId: ws.studentId,
              name,
              tagline,
              description
            });
            ws.send(JSON.stringify({
              type: "invention_submitted",
              data: { invention }
            }));
            const inventions = await storage.getInventionsByRoom(room.id);
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(ws.roomCode, {
              type: "inventions_updated",
              data: {
                inventions: inventions.map((inv) => {
                  const student = students.find((s) => s.id === inv.studentId);
                  return { ...inv, studentNickname: student?.nickname };
                }),
                submissionCount: inventions.length,
                totalStudents: students.length
              }
            });
            break;
          }
          case "start_voting": {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Only teachers can start voting" }
              }));
              return;
            }
            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;
            await storage.updateGameRoom(ws.roomCode, {
              phase: "voting"
            });
            const inventions = await storage.getInventionsByRoom(room.id);
            const students = await storage.getStudentsByRoom(room.id);
            const inventionsWithStudents = inventions.map((inv) => {
              const student = students.find((s) => s.id === inv.studentId);
              return {
                id: inv.id,
                name: inv.name,
                tagline: inv.tagline,
                studentNickname: student?.nickname,
                studentId: inv.studentId
              };
            });
            broadcastToRoom(ws.roomCode, {
              type: "voting_started",
              data: { inventions: inventionsWithStudents }
            }, ws);
            ws.send(JSON.stringify({
              type: "voting_started_success"
            }));
            break;
          }
          case "submit_vote": {
            if (!ws.studentId || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Invalid student session" }
              }));
              return;
            }
            const { inventionId } = message.data;
            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;
            const existingVote = await storage.getVoteByStudent(room.id, ws.studentId);
            if (existingVote) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "You have already voted" }
              }));
              return;
            }
            const invention = await storage.getInventionById(inventionId);
            if (invention && invention.studentId === ws.studentId) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "You cannot vote for your own invention" }
              }));
              return;
            }
            await storage.addVote({
              roomId: room.id,
              studentId: ws.studentId,
              inventionId
            });
            ws.send(JSON.stringify({
              type: "vote_submitted",
              data: { inventionId }
            }));
            const votes = await storage.getVotesByRoom(room.id);
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(ws.roomCode, {
              type: "votes_updated",
              data: {
                voteCount: votes.length,
                totalStudents: students.length
              }
            });
            break;
          }
          case "show_results": {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Only teachers can show results" }
              }));
              return;
            }
            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;
            await storage.updateGameRoom(ws.roomCode, {
              phase: "results"
            });
            const results = await storage.getInventionsWithVotes(room.id);
            broadcastToRoom(ws.roomCode, {
              type: "results_ready",
              data: { results }
            });
            break;
          }
          case "new_round": {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: "error",
                data: { message: "Only teachers can start new rounds" }
              }));
              return;
            }
            await storage.updateGameRoom(ws.roomCode, {
              phase: "setup",
              problem: null
            });
            const room = await storage.getGameRoom(ws.roomCode);
            if (room) {
              const inventions = await storage.getInventionsByRoom(room.id);
              const votes = await storage.getVotesByRoom(room.id);
            }
            broadcastToRoom(ws.roomCode, {
              type: "new_round_started"
            });
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({
          type: "error",
          data: { message: "Invalid message format" }
        }));
      }
    });
    ws.on("close", async () => {
      console.log("WebSocket connection closed");
      if (ws.roomCode) {
        const connections = roomConnections.get(ws.roomCode);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            roomConnections.delete(ws.roomCode);
            teacherConnections.delete(ws.roomCode);
          }
        }
        if (ws.studentId) {
          await storage.updateStudent(ws.studentId, {
            isConnected: false
          });
          const room = await storage.getGameRoom(ws.roomCode);
          if (room) {
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(ws.roomCode, {
              type: "students_updated",
              data: { students }
            });
          }
        }
      }
    });
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
