# Innovation Station: Classroom Edition

A real-time classroom game inspired by Jackbox's "Patently Stupid" where students create and pitch text-based inventions to solve teacher-provided problems, with voting and results display.

## Features

- **Teacher Interface**: Create rooms, broadcast problems, manage game phases
- **Student Interface**: Join rooms, submit inventions, vote on favorites
- **Real-time Communication**: WebSocket-based live updates
- **Game Phases**: Setup → Invention → Voting → Results
- **Clean UI**: Modern design with shadcn/ui components

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   - Navigate to `http://localhost:5000`
   - Click "Teacher / Main Screen" to create a room
   - Click "Student" to join a room

## How to Play

### For Teachers:
1. Click "Create Room" to start a new game session
2. Share the room code with students
3. Set a problem for students to solve
4. Click "Broadcast Problem" to start the invention phase
5. When ready, start the voting phase
6. View results when voting is complete

### For Students:
1. Enter the room code and your nickname
2. Click "Join Room"
3. Wait for the teacher to broadcast a problem
4. Submit your invention with name, tagline, and description
5. Vote for your favorite invention when voting starts
6. See the results!

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and state management
│   │   └── pages/          # Main application pages
├── server/                 # Backend Express server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # WebSocket and API routes
│   └── storage.ts         # In-memory data storage
├── shared/                 # Shared types and schemas
└── package.json           # Dependencies and scripts
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, WebSocket (ws)
- **Build**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS with custom design system

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Deployment

This application is designed to work on any platform that supports Node.js. The WebSocket server automatically adapts to the hosting environment.

## Game Flow

1. **Setup Phase**: Teacher creates room, students join
2. **Invention Phase**: Students create solutions to the given problem
3. **Voting Phase**: Students vote for their favorite inventions
4. **Results Phase**: Display winning inventions with vote counts

## Features in Detail

- **Real-time Updates**: All participants see live updates as students join and submit
- **Room Management**: Simple 4-character room codes for easy sharing
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Error Handling**: Clear feedback for connection issues and validation errors
- **Clean Interface**: Intuitive design focused on classroom usability

---

Built with ❤️ for educators and students to make learning interactive and fun!