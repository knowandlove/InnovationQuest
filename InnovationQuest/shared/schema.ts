import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const gameRooms = pgTable("game_rooms", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  problem: text("problem"),
  phase: text("phase").notNull().default("setup"), // setup, invention, pitch, voting, results
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  nickname: text("nickname").notNull(),
  socketId: text("socket_id"),
  isConnected: boolean("is_connected").default(true),
});

export const inventions = pgTable("inventions", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  studentId: integer("student_id").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  drawing: text("drawing"), // Base64 encoded image data
  createdAt: timestamp("created_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  studentId: integer("student_id").notNull(),
  inventionId: integer("invention_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).omit({
  id: true,
  createdAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
});

export const insertInventionSchema = createInsertSchema(inventions).omit({
  id: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export type GameRoom = typeof gameRooms.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Invention = typeof inventions.$inferSelect;
export type Vote = typeof votes.$inferSelect;

export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertInvention = z.infer<typeof insertInventionSchema>;
export type InsertVote = z.infer<typeof insertVoteSchema>;

// WebSocket message types
export interface WSMessage {
  type: string;
  data?: any;
}

export interface CreateRoomMessage extends WSMessage {
  type: 'create_room';
}

export interface JoinRoomMessage extends WSMessage {
  type: 'join_room';
  data: {
    roomCode: string;
    nickname: string;
  };
}

export interface BroadcastProblemMessage extends WSMessage {
  type: 'broadcast_problem';
  data: {
    problem: string;
  };
}

export interface SubmitInventionMessage extends WSMessage {
  type: 'submit_invention';
  data: {
    name: string;
    tagline: string;
    description: string;
    drawing?: string; // Base64 encoded image data
  };
}

export interface StartVotingMessage extends WSMessage {
  type: 'start_voting';
}

export interface SubmitVoteMessage extends WSMessage {
  type: 'submit_vote';
  data: {
    inventionId: number;
  };
}

export interface NextPhaseMessage extends WSMessage {
  type: 'next_phase';
  data: {
    phase: string;
  };
}
