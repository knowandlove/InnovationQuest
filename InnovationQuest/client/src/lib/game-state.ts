import { create } from 'zustand';

export type GamePhase = 'setup' | 'invention' | 'pitch' | 'voting' | 'results';

export interface Student {
  id: number;
  nickname: string;
  isConnected: boolean;
}

export interface Invention {
  id: number;
  name: string;
  tagline: string;
  description: string;
  studentId: number;
  studentNickname?: string;
}

export interface InventionWithVotes extends Invention {
  voteCount: number;
}

export interface GameState {
  // Connection state
  isConnected: boolean;
  isTeacher: boolean;
  roomCode: string | null;
  studentId: number | null;
  nickname: string | null;
  
  // Game state
  currentPhase: GamePhase;
  problem: string | null;
  students: Student[];
  inventions: Invention[];
  results: InventionWithVotes[];
  currentInventionIndex: number;
  
  // Voting state
  availableInventions: Invention[];
  selectedVote: number | null;
  hasVoted: boolean;
  voteCount: number;
  
  // Error state
  error: string | null;
  
  // Actions
  setConnectionState: (connected: boolean) => void;
  setTeacherMode: (isTeacher: boolean) => void;
  setRoomCode: (roomCode: string) => void;
  setStudentInfo: (studentId: number, nickname: string) => void;
  setCurrentPhase: (phase: GamePhase) => void;
  setProblem: (problem: string) => void;
  setStudents: (students: Student[]) => void;
  setInventions: (inventions: Invention[]) => void;
  setResults: (results: InventionWithVotes[]) => void;
  setCurrentInventionIndex: (index: number) => void;
  setAvailableInventions: (inventions: Invention[]) => void;
  setSelectedVote: (inventionId: number | null) => void;
  setHasVoted: (voted: boolean) => void;
  setVoteCount: (count: number) => void;
  setError: (error: string | null) => void;
  
  // Complex actions
  nextInvention: () => void;
  previousInvention: () => void;
  reset: () => void;
}

export const useGameState = create<GameState>((set, get) => ({
  // Initial state
  isConnected: false,
  isTeacher: false,
  roomCode: null,
  studentId: null,
  nickname: null,
  currentPhase: 'setup',
  problem: null,
  students: [],
  inventions: [],
  results: [],
  currentInventionIndex: 0,
  availableInventions: [],
  selectedVote: null,
  hasVoted: false,
  voteCount: 0,
  error: null,

  // Basic setters
  setConnectionState: (connected) => set({ isConnected: connected }),
  setTeacherMode: (isTeacher) => set({ isTeacher }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setStudentInfo: (studentId, nickname) => set({ studentId, nickname }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setProblem: (problem) => set({ problem }),
  setStudents: (students) => set({ students }),
  setInventions: (inventions) => set({ inventions }),
  setResults: (results) => set({ results }),
  setCurrentInventionIndex: (index) => set({ currentInventionIndex: index }),
  setAvailableInventions: (inventions) => set({ availableInventions: inventions }),
  setSelectedVote: (inventionId) => set({ selectedVote: inventionId }),
  setHasVoted: (voted) => set({ hasVoted: voted }),
  setVoteCount: (count) => set({ voteCount: count }),
  setError: (error) => set({ error }),

  // Complex actions
  nextInvention: () => {
    const { inventions, currentInventionIndex } = get();
    if (currentInventionIndex < inventions.length - 1) {
      set({ currentInventionIndex: currentInventionIndex + 1 });
    }
  },

  previousInvention: () => {
    const { currentInventionIndex } = get();
    if (currentInventionIndex > 0) {
      set({ currentInventionIndex: currentInventionIndex - 1 });
    }
  },

  reset: () => set({
    isConnected: false,
    isTeacher: false,
    roomCode: null,
    studentId: null,
    nickname: null,
    currentPhase: 'setup',
    problem: null,
    students: [],
    inventions: [],
    results: [],
    currentInventionIndex: 0,
    availableInventions: [],
    selectedVote: null,
    hasVoted: false,
    voteCount: 0,
    error: null,
  }),
}));
