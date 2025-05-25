import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { 
  WSMessage, 
  CreateRoomMessage, 
  JoinRoomMessage, 
  BroadcastProblemMessage,
  SubmitInventionMessage,
  StartVotingMessage,
  SubmitVoteMessage,
  NextPhaseMessage
} from "@shared/schema";

interface ClientConnection extends WebSocket {
  roomCode?: string;
  studentId?: number;
  isTeacher?: boolean;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections by room
  const roomConnections = new Map<string, Set<ClientConnection>>();
  const teacherConnections = new Map<string, ClientConnection>();

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function broadcastToRoom(roomCode: string, message: WSMessage, excludeWs?: WebSocket) {
    const connections = roomConnections.get(roomCode);
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    const failedConnections = new Set<WebSocket>();
    
    connections.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Failed to send message to connection:', error);
          failedConnections.add(ws);
        }
      }
    });

    // Clean up failed connections
    failedConnections.forEach(ws => connections.delete(ws));
  }

  function sendToTeacher(roomCode: string, message: WSMessage) {
    const teacherWs = teacherConnections.get(roomCode);
    if (teacherWs && teacherWs.readyState === WebSocket.OPEN) {
      try {
        teacherWs.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message to teacher:', error);
        // Remove failed teacher connection
        teacherConnections.delete(roomCode);
        const connections = roomConnections.get(roomCode);
        if (connections) {
          connections.delete(teacherWs);
        }
      }
    }
  }

  wss.on('connection', (ws: ClientConnection) => {
    console.log('New WebSocket connection established');
    
    // Send immediate confirmation
    ws.send(JSON.stringify({ type: 'connection_established' }));

    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        console.log('Received message:', message.type);

        switch (message.type) {
          case 'create_room': {
            const roomCode = generateRoomCode();
            
            // Create game room in storage
            await storage.createGameRoom({
              roomCode,
              phase: 'setup',
              problem: null,
            });

            // Set up teacher connection
            ws.roomCode = roomCode;
            ws.isTeacher = true;
            teacherConnections.set(roomCode, ws);
            
            if (!roomConnections.has(roomCode)) {
              roomConnections.set(roomCode, new Set());
            }
            roomConnections.get(roomCode)!.add(ws);

            ws.send(JSON.stringify({
              type: 'room_created',
              data: { roomCode }
            }));
            break;
          }

          case 'join_room': {
            const { roomCode, nickname } = (message as JoinRoomMessage).data;
            
            // Verify room exists
            const room = await storage.getGameRoom(roomCode);
            if (!room) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Room not found' }
              }));
              return;
            }

            // Check if nickname is already taken
            const existingStudent = await storage.getStudentByNickname(room.id, nickname);
            if (existingStudent) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Nickname already taken' }
              }));
              return;
            }

            // Add student to storage
            const student = await storage.addStudent({
              roomId: room.id,
              nickname,
              socketId: 'ws-' + Date.now(),
              isConnected: true,
            });

            // Set up student connection
            ws.roomCode = roomCode;
            ws.studentId = student.id;
            
            if (!roomConnections.has(roomCode)) {
              roomConnections.set(roomCode, new Set());
            }
            roomConnections.get(roomCode)!.add(ws);

            // Send success to student
            ws.send(JSON.stringify({
              type: 'joined_room',
              data: { 
                roomCode, 
                studentId: student.id,
                currentPhase: room.phase,
                problem: room.problem
              }
            }));

            // Update teacher with student list
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(roomCode, {
              type: 'students_updated',
              data: { students }
            });
            break;
          }

          case 'broadcast_problem': {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only teachers can broadcast problems' }
              }));
              return;
            }

            const { problem } = (message as BroadcastProblemMessage).data;
            
            // Update room in storage
            await storage.updateGameRoom(ws.roomCode, {
              problem,
              phase: 'invention'
            });

            // Broadcast to all students in room
            broadcastToRoom(ws.roomCode, {
              type: 'problem_broadcast',
              data: { problem }
            }, ws);

            ws.send(JSON.stringify({
              type: 'problem_broadcast_success',
              data: { problem }
            }));
            break;
          }

          case 'submit_invention': {
            if (!ws.studentId || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid student session' }
              }));
              return;
            }

            const { name, tagline, description, drawing } = (message as SubmitInventionMessage).data;
            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;

            // Add invention to storage
            const invention = await storage.addInvention({
              roomId: room.id,
              studentId: ws.studentId,
              name,
              tagline,
              description,
              drawing: drawing || null,
            });

            // Confirm to student
            ws.send(JSON.stringify({
              type: 'invention_submitted',
              data: { invention }
            }));

            // Update teacher with new submission
            const inventions = await storage.getInventionsByRoom(room.id);
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(ws.roomCode, {
              type: 'inventions_updated',
              data: { 
                inventions: inventions.map(inv => {
                  const student = students.find(s => s.id === inv.studentId);
                  return { ...inv, studentNickname: student?.nickname };
                }),
                submissionCount: inventions.length,
                totalStudents: students.length
              }
            });
            break;
          }

          case 'start_voting': {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only teachers can start voting' }
              }));
              return;
            }

            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;

            // Update room phase
            await storage.updateGameRoom(ws.roomCode, {
              phase: 'voting'
            });

            // Get inventions with student names for voting
            const inventions = await storage.getInventionsByRoom(room.id);
            const students = await storage.getStudentsByRoom(room.id);
            
            const inventionsWithStudents = inventions.map(inv => {
              const student = students.find(s => s.id === inv.studentId);
              return { 
                id: inv.id,
                name: inv.name, 
                tagline: inv.tagline,
                studentNickname: student?.nickname,
                studentId: inv.studentId
              };
            });

            // Broadcast voting start to all students
            broadcastToRoom(ws.roomCode, {
              type: 'voting_started',
              data: { inventions: inventionsWithStudents }
            }, ws);

            ws.send(JSON.stringify({
              type: 'voting_started_success'
            }));
            break;
          }

          case 'submit_vote': {
            if (!ws.studentId || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Invalid student session' }
              }));
              return;
            }

            const { inventionId } = (message as SubmitVoteMessage).data;
            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;

            // Check if student already voted
            const existingVote = await storage.getVoteByStudent(room.id, ws.studentId);
            if (existingVote) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'You have already voted' }
              }));
              return;
            }

            // Check if trying to vote for own invention
            const invention = await storage.getInventionById(inventionId);
            if (invention && invention.studentId === ws.studentId) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'You cannot vote for your own invention' }
              }));
              return;
            }

            // Add vote to storage
            await storage.addVote({
              roomId: room.id,
              studentId: ws.studentId,
              inventionId,
            });

            // Confirm to student
            ws.send(JSON.stringify({
              type: 'vote_submitted',
              data: { inventionId }
            }));

            // Update teacher with vote progress
            const votes = await storage.getVotesByRoom(room.id);
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(ws.roomCode, {
              type: 'votes_updated',
              data: { 
                voteCount: votes.length,
                totalStudents: students.length
              }
            });
            break;
          }

          case 'show_results': {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only teachers can show results' }
              }));
              return;
            }

            const room = await storage.getGameRoom(ws.roomCode);
            if (!room) return;

            // Update room phase
            await storage.updateGameRoom(ws.roomCode, {
              phase: 'results'
            });

            // Get results with vote counts
            const results = await storage.getInventionsWithVotes(room.id);

            // Broadcast results to everyone
            broadcastToRoom(ws.roomCode, {
              type: 'results_ready',
              data: { results }
            });
            break;
          }

          case 'new_round': {
            if (!ws.isTeacher || !ws.roomCode) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Only teachers can start new rounds' }
              }));
              return;
            }

            // Reset room to setup phase, clear problem
            await storage.updateGameRoom(ws.roomCode, {
              phase: 'setup',
              problem: null
            });

            // Clear inventions and votes for new round
            const room = await storage.getGameRoom(ws.roomCode);
            if (room) {
              const inventions = await storage.getInventionsByRoom(room.id);
              const votes = await storage.getVotesByRoom(room.id);
              
              // In a real implementation, you'd want soft delete or archiving
              // For now, we'll keep the data but reset the phase
            }

            // Broadcast new round to everyone
            broadcastToRoom(ws.roomCode, {
              type: 'new_round_started'
            });
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', async () => {
      console.log('WebSocket connection closed');
      
      if (ws.roomCode) {
        const connections = roomConnections.get(ws.roomCode);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            roomConnections.delete(ws.roomCode);
            teacherConnections.delete(ws.roomCode);
          }
        }

        // Update student connection status
        if (ws.studentId) {
          await storage.updateStudent(ws.studentId, {
            isConnected: false
          });

          // Notify teacher of disconnection
          const room = await storage.getGameRoom(ws.roomCode);
          if (room) {
            const students = await storage.getStudentsByRoom(room.id);
            sendToTeacher(ws.roomCode, {
              type: 'students_updated',
              data: { students }
            });
          }
        }
      }
    });
  });

  return httpServer;
}
