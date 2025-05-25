import { useEffect, useRef, useCallback } from 'react';
import { useGameState } from '@/lib/game-state';
import { useToast } from '@/hooks/use-toast';
import type { WSMessage } from '@shared/schema';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  const {
    setConnectionState,
    setRoomCode,
    setStudentInfo,
    setCurrentPhase,
    setProblem,
    setStudents,
    setInventions,
    setResults,
    setAvailableInventions,
    setVoteCount,
    setError,
    isConnected,
  } = useGameState();

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Attempting to connect to:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionState(true);
        setError(null);
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionState(false);
        
        // Don't auto-reconnect to avoid infinite loops
        // reconnectTimeout.current = setTimeout(() => {
        //   if (!isConnected) {
        //     connect();
        //   }
        // }, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        
        // Don't auto-reconnect to stop the loop
        console.log('WebSocket error - connection disabled to prevent loop');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to server');
    }
  }, [setConnectionState, setError, isConnected]);

  const handleMessage = useCallback((message: WSMessage) => {
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'room_created':
        setRoomCode(message.data.roomCode);
        toast({
          title: "Room Created",
          description: `Room code: ${message.data.roomCode}`,
        });
        break;

      case 'joined_room':
        setRoomCode(message.data.roomCode);
        setStudentInfo(message.data.studentId, '');
        setCurrentPhase(message.data.currentPhase);
        if (message.data.problem) {
          setProblem(message.data.problem);
        }
        toast({
          title: "Joined Room",
          description: `Successfully joined room ${message.data.roomCode}`,
        });
        break;

      case 'students_updated':
        setStudents(message.data.students);
        break;

      case 'problem_broadcast':
        setProblem(message.data.problem);
        setCurrentPhase('invention');
        toast({
          title: "New Problem",
          description: "The teacher has set a new problem to solve!",
        });
        break;

      case 'problem_broadcast_success':
        setCurrentPhase('invention');
        toast({
          title: "Problem Broadcast",
          description: "Problem sent to all students successfully!",
        });
        break;

      case 'invention_submitted':
        toast({
          title: "Invention Submitted",
          description: "Your invention has been submitted successfully!",
        });
        break;

      case 'inventions_updated':
        setInventions(message.data.inventions);
        break;

      case 'voting_started':
        setCurrentPhase('voting');
        setAvailableInventions(message.data.inventions);
        toast({
          title: "Voting Started",
          description: "Time to vote for your favorite invention!",
        });
        break;

      case 'voting_started_success':
        setCurrentPhase('voting');
        toast({
          title: "Voting Phase",
          description: "Voting has been started for students!",
        });
        break;

      case 'vote_submitted':
        toast({
          title: "Vote Submitted",
          description: "Your vote has been recorded!",
        });
        break;

      case 'votes_updated':
        setVoteCount(message.data.voteCount);
        break;

      case 'results_ready':
        setCurrentPhase('results');
        setResults(message.data.results);
        toast({
          title: "Results Ready",
          description: "The voting results are now available!",
        });
        break;

      case 'new_round_started':
        setCurrentPhase('setup');
        setProblem(null);
        setInventions([]);
        setResults([]);
        setAvailableInventions([]);
        setVoteCount(0);
        toast({
          title: "New Round",
          description: "A new round has started!",
        });
        break;

      case 'error':
        const errorMsg = message.data?.message || 'An error occurred';
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, [
    setRoomCode,
    setStudentInfo,
    setCurrentPhase,
    setProblem,
    setStudents,
    setInventions,
    setResults,
    setAvailableInventions,
    setVoteCount,
    setError,
    toast,
  ]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      setError('Not connected to server');
    }
  }, [setError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setConnectionState(false);
  }, [setConnectionState]);

  // Don't auto-connect to avoid the infinite loop
  // useEffect(() => {
  //   connect();
  //   return () => {
  //     disconnect();
  //   };
  // }, [connect, disconnect]);

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
