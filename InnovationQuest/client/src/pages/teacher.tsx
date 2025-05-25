import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Presentation, 
  ArrowLeft, 
  Play, 
  Users, 
  HelpCircle, 
  Send, 
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Vote,
  Trophy,
  RotateCcw,
  StopCircle,
  Mic
} from "lucide-react";
import { useSimpleWebSocket } from "@/hooks/use-simple-websocket";
import { useGameState } from "@/lib/game-state";

export default function Teacher() {
  const { connect, sendMessage } = useSimpleWebSocket();
  const {
    isConnected,
    roomCode,
    currentPhase,
    problem,
    students,
    inventions,
    results,
    currentInventionIndex,
    voteCount,
    setTeacherMode,
    setCurrentPhase,
    nextInvention,
    previousInvention,
  } = useGameState();

  const [problemText, setProblemText] = useState("");

  // Set teacher mode when component mounts
  useEffect(() => {
    setTeacherMode(true);
  }, [setTeacherMode]);

  const handleConnect = () => {
    connect();
  };

  const createRoom = async () => {
    sendMessage({ type: 'create_room' });
  };

  const broadcastProblem = () => {
    if (!problemText.trim()) {
      return;
    }
    sendMessage({
      type: 'broadcast_problem',
      data: { problem: problemText }
    });
    setProblemText("");
  };

  const startVoting = () => {
    sendMessage({ type: 'start_voting' });
  };

  const showResults = () => {
    sendMessage({ type: 'show_results' });
  };

  const startNewRound = () => {
    sendMessage({ type: 'new_round' });
    setProblemText("");
  };

  const currentInvention = inventions[currentInventionIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-white p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <Presentation size={24} />
            <h1 className="text-xl font-semibold">Teacher Control Panel</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {roomCode && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                ROOM: {roomCode}
              </Badge>
            )}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Game Setup Phase */}
        {currentPhase === 'setup' && !roomCode && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Play className="text-secondary" size={24} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Create New Game</h2>
                <p className="text-muted-foreground mb-8">Start a new Innovation Station session</p>
                <Button onClick={createRoom} size="lg" className="w-full">
                  Generate Room Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Room Created Phase */}
        {roomCode && currentPhase === 'setup' && (
          <>
            {/* Room Code Display */}
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-4">Room Code</h2>
                  <div className="text-6xl font-bold text-secondary mb-4">{roomCode}</div>
                  <p className="text-muted-foreground">Students can join at this code</p>
                </div>
              </CardContent>
            </Card>

            {/* Connected Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="text-primary mr-2" size={20} />
                  Connected Students ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Waiting for students to join...
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {students.map((student) => (
                      <div key={student.id} className="bg-muted rounded-lg p-3 text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          student.isConnected ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        }`}>
                          <Users size={16} />
                        </div>
                        <p className="text-sm font-medium">{student.nickname}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Problem Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="text-accent mr-2" size={20} />
                  Set Problem to Solve
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  rows={4}
                  placeholder="Enter the problem for students to solve with their inventions..."
                  className="resize-none"
                />
                <Button 
                  onClick={broadcastProblem} 
                  disabled={!problemText.trim()}
                  className="bg-accent hover:bg-accent/90"
                >
                  <Send className="mr-2" size={16} />
                  Broadcast Problem to Students
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Invention Collection Phase */}
        {currentPhase === 'invention' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Lightbulb className="text-accent mr-2" size={20} />
                  Collecting Inventions
                </CardTitle>
                <Badge variant="secondary">
                  {inventions.length} of {students.length} submitted
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {problem && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Problem:</div>
                  <div className="p-4 bg-muted rounded-xl">{problem}</div>
                </div>
              )}

              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="loading-spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Waiting for students to submit their inventions...</p>
                </div>
              </div>

              <Button 
                onClick={() => setCurrentPhase('pitch')} 
                className="w-full bg-success hover:bg-success/90"
                disabled={inventions.length === 0}
              >
                Start Pitch Phase
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pitch Phase */}
        {currentPhase === 'pitch' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pitch Presentations</h2>
              <Badge variant="secondary">
                {currentInventionIndex + 1} of {inventions.length}
              </Badge>
            </div>

            {currentInvention && (
              <Card className="invention-card">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Mic className="text-primary" size={32} />
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">Now Presenting:</div>
                    <h3 className="text-2xl font-bold mb-2">{currentInvention.name}</h3>
                    <p className="text-lg text-primary font-medium mb-4">"{currentInvention.tagline}"</p>
                    <div className="text-sm text-muted-foreground mb-4">
                      by {currentInvention.studentNickname}
                    </div>
                    
                    <Card className="bg-muted">
                      <CardContent className="p-6">
                        <h4 className="font-semibold mb-3">Description:</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {currentInvention.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex space-x-4">
              <Button 
                onClick={previousInvention}
                disabled={currentInventionIndex === 0}
                variant="outline"
                className="flex-1"
              >
                <ChevronLeft size={16} className="mr-2" />
                Previous
              </Button>
              <Button 
                onClick={nextInvention}
                disabled={currentInventionIndex >= inventions.length - 1}
                className="flex-1"
              >
                Next
                <ChevronRight size={16} className="ml-2" />
              </Button>
              <Button 
                onClick={startVoting}
                className="flex-1 bg-success hover:bg-success/90"
              >
                Start Voting
                <Vote size={16} className="ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Voting Phase */}
        {currentPhase === 'voting' && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Vote className="text-success" size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-4">Voting in Progress</h2>
              <p className="text-muted-foreground mb-8">Students are voting for their favorite invention</p>
              
              <div className="mb-8">
                <div className="text-sm font-medium text-muted-foreground mb-2">Votes Received:</div>
                <div className="text-4xl font-bold text-success">{voteCount} of {students.length}</div>
              </div>

              <div className="bg-success/10 rounded-xl p-6 mb-8">
                <p className="text-success font-medium">Waiting for all students to vote...</p>
              </div>

              <Button onClick={showResults} className="bg-success hover:bg-success/90">
                Show Results
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results Phase */}
        {currentPhase === 'results' && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">🏆 Results</h2>
            </div>

            {results.length > 0 && (
              <>
                {/* Winner */}
                <Card className="results-winner">
                  <CardContent className="p-8 text-center">
                    <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="text-accent" size={32} />
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">🥇 Winner</div>
                    <h3 className="text-2xl font-bold mb-2">{results[0].name}</h3>
                    <p className="text-lg text-primary font-medium mb-2">"{results[0].tagline}"</p>
                    <div className="text-sm text-muted-foreground mb-4">
                      by {results[0].studentNickname}
                    </div>
                    <Badge className="bg-accent text-accent-foreground text-lg px-4 py-2">
                      {results[0].voteCount} votes
                    </Badge>
                  </CardContent>
                </Card>

                {/* All Results */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Inventions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.map((result, index) => (
                        <div key={result.id} className="flex items-center justify-between p-4 bg-muted rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-accent/20 text-accent' : 'bg-muted-foreground/20 text-muted-foreground'
                            }`}>
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-medium">{result.name}</div>
                              <div className="text-sm text-muted-foreground">by {result.studentNickname}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{result.voteCount}</div>
                            <div className="text-sm text-muted-foreground">votes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex space-x-4">
              <Button onClick={startNewRound} className="flex-1">
                <RotateCcw size={16} className="mr-2" />
                New Round
              </Button>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <StopCircle size={16} className="mr-2" />
                  End Game
                </Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
