import { 
  gameRooms, 
  students, 
  inventions, 
  votes,
  type GameRoom, 
  type Student, 
  type Invention, 
  type Vote,
  type InsertGameRoom,
  type InsertStudent,
  type InsertInvention,
  type InsertVote
} from "@shared/schema";

export interface IStorage {
  // Game Room operations
  createGameRoom(room: InsertGameRoom): Promise<GameRoom>;
  getGameRoom(roomCode: string): Promise<GameRoom | undefined>;
  updateGameRoom(roomCode: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined>;
  
  // Student operations
  addStudent(student: InsertStudent): Promise<Student>;
  getStudentsByRoom(roomId: number): Promise<Student[]>;
  getStudentByNickname(roomId: number, nickname: string): Promise<Student | undefined>;
  updateStudent(id: number, updates: Partial<Student>): Promise<Student | undefined>;
  removeStudent(id: number): Promise<void>;
  
  // Invention operations
  addInvention(invention: InsertInvention): Promise<Invention>;
  getInventionsByRoom(roomId: number): Promise<Invention[]>;
  getInventionById(id: number): Promise<Invention | undefined>;
  
  // Vote operations
  addVote(vote: InsertVote): Promise<Vote>;
  getVotesByRoom(roomId: number): Promise<Vote[]>;
  getVoteByStudent(roomId: number, studentId: number): Promise<Vote | undefined>;
  
  // Aggregate operations
  getInventionsWithVotes(roomId: number): Promise<Array<Invention & { voteCount: number; studentNickname: string }>>;
}

export class MemStorage implements IStorage {
  private gameRooms: Map<string, GameRoom>;
  private students: Map<number, Student>;
  private inventions: Map<number, Invention>;
  private votes: Map<number, Vote>;
  private currentIds: {
    gameRooms: number;
    students: number;
    inventions: number;
    votes: number;
  };

  constructor() {
    this.gameRooms = new Map();
    this.students = new Map();
    this.inventions = new Map();
    this.votes = new Map();
    this.currentIds = {
      gameRooms: 1,
      students: 1,
      inventions: 1,
      votes: 1,
    };
  }

  async createGameRoom(insertRoom: InsertGameRoom): Promise<GameRoom> {
    const id = this.currentIds.gameRooms++;
    const room: GameRoom = {
      id,
      roomCode: insertRoom.roomCode,
      problem: insertRoom.problem || null,
      phase: insertRoom.phase || 'setup',
      createdAt: new Date(),
    };
    this.gameRooms.set(room.roomCode, room);
    return room;
  }

  async getGameRoom(roomCode: string): Promise<GameRoom | undefined> {
    return this.gameRooms.get(roomCode);
  }

  async updateGameRoom(roomCode: string, updates: Partial<GameRoom>): Promise<GameRoom | undefined> {
    const room = this.gameRooms.get(roomCode);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates };
    this.gameRooms.set(roomCode, updatedRoom);
    return updatedRoom;
  }

  async addStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.currentIds.students++;
    const student: Student = {
      id,
      roomId: insertStudent.roomId,
      nickname: insertStudent.nickname,
      socketId: insertStudent.socketId || null,
      isConnected: insertStudent.isConnected ?? true,
    };
    this.students.set(id, student);
    return student;
  }

  async getStudentsByRoom(roomId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(
      (student) => student.roomId === roomId
    );
  }

  async getStudentByNickname(roomId: number, nickname: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.roomId === roomId && student.nickname === nickname
    );
  }

  async updateStudent(id: number, updates: Partial<Student>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;
    
    const updatedStudent = { ...student, ...updates };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async removeStudent(id: number): Promise<void> {
    this.students.delete(id);
  }

  async addInvention(insertInvention: InsertInvention): Promise<Invention> {
    const id = this.currentIds.inventions++;
    const invention: Invention = {
      ...insertInvention,
      id,
      createdAt: new Date(),
      drawing: insertInvention.drawing ?? null,
    };
    this.inventions.set(id, invention);
    return invention;
  }

  async getInventionsByRoom(roomId: number): Promise<Invention[]> {
    return Array.from(this.inventions.values()).filter(
      (invention) => invention.roomId === roomId
    );
  }

  async getInventionById(id: number): Promise<Invention | undefined> {
    return this.inventions.get(id);
  }

  async addVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.currentIds.votes++;
    const vote: Vote = {
      ...insertVote,
      id,
      createdAt: new Date(),
    };
    this.votes.set(id, vote);
    return vote;
  }

  async getVotesByRoom(roomId: number): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(
      (vote) => vote.roomId === roomId
    );
  }

  async getVoteByStudent(roomId: number, studentId: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(
      (vote) => vote.roomId === roomId && vote.studentId === studentId
    );
  }

  async getInventionsWithVotes(roomId: number): Promise<Array<Invention & { voteCount: number; studentNickname: string }>> {
    const inventions = await this.getInventionsByRoom(roomId);
    const votes = await this.getVotesByRoom(roomId);
    const students = await this.getStudentsByRoom(roomId);
    
    return inventions.map(invention => {
      const voteCount = votes.filter(vote => vote.inventionId === invention.id).length;
      const student = students.find(s => s.id === invention.studentId);
      return {
        ...invention,
        voteCount,
        studentNickname: student?.nickname || 'Unknown',
      };
    }).sort((a, b) => b.voteCount - a.voteCount);
  }
}

export const storage = new MemStorage();
