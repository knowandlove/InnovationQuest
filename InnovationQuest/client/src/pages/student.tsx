import { useState, useEffect } from "react";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  GraduationCap, 
  ArrowLeft, 
  DoorOpen, 
  CheckCircle, 
  HelpCircle,
  Lightbulb,
  Send,
  Vote,
  Trophy,
  Lock,
  PartyPopper
} from "lucide-react";
import { useSimpleWebSocket } from "@/hooks/use-simple-websocket";
import { useGameState } from "@/lib/game-state";

export default function Student() {
  const { connect, sendMessage } = useSimpleWebSocket();
  const {
    isConnected,
    roomCode,
    studentId,
    nickname,
    currentPhase,
    problem,
    availableInventions,
    selectedVote,
    hasVoted,
    results,
    setTeacherMode,
    setSelectedVote,
  } = useGameState();

  const [joinForm, setJoinForm] = useState({
    roomCode: "",
    nickname: "",
  });

  const [inventionForm, setInventionForm] = useState({
    name: "",
    tagline: "",
    description: "",
    drawing: "",
  });

  const [hasSubmittedInvention, setHasSubmittedInvention] = useState(false);

  // Set student mode when component mounts
  useEffect(() => {
    setTeacherMode(false);
  }, [setTeacherMode]);

  // Reset submission state when phase changes
  useEffect(() => {
    if (currentPhase !== 'invention') {
      setHasSubmittedInvention(false);
    }
  }, [currentPhase]);

  const joinRoom = async () => {
    if (!joinForm.roomCode.trim() || !joinForm.nickname.trim()) {
      return;
    }
    
    sendMessage({
      type: 'join_room',
      data: {
        roomCode: joinForm.roomCode.toUpperCase(),
        nickname: joinForm.nickname,
      }
    });
  };

  const submitInvention = () => {
    if (!inventionForm.name.trim() || !inventionForm.tagline.trim() || !inventionForm.description.trim()) {
      return;
    }
    if (hasSubmittedInvention) {
      return; // Prevent multiple submissions
    }
    
    sendMessage({
      type: 'submit_invention',
      data: inventionForm,
    });
    
    // Mark as submitted and clear form
    setHasSubmittedInvention(true);
    setInventionForm({ name: "", tagline: "", description: "", drawing: "" });
  };

  const handleDrawingSave = (imageData: string) => {
    setInventionForm(prev => ({ ...prev, drawing: imageData }));
  };

  const submitVote = () => {
    if (selectedVote === null) return;
    sendMessage({
      type: 'submit_vote',
      data: { inventionId: selectedVote }
    });
  };

  const isWinner = results.length > 0 && results[0].studentId === studentId;
  const myInvention = availableInventions.find(inv => inv.studentId === studentId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
            <GraduationCap size={24} />
            <h1 className="text-xl font-semibold">Innovation Station</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {roomCode && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {roomCode}
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

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Join Game Phase */}
        {!roomCode && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <DoorOpen className="text-primary" size={24} />
                </div>
                <h2 className="text-xl font-bold mb-2">Join Game</h2>
                <p className="text-muted-foreground">Enter the room code from your teacher</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="roomCode">Room Code</Label>
                  <Input
                    id="roomCode"
                    value={joinForm.roomCode}
                    onChange={(e) => setJoinForm(prev => ({ ...prev, roomCode: e.target.value.toUpperCase() }))}
                    placeholder="ABC123"
                    maxLength={6}
                    className="text-center text-2xl font-bold tracking-widest"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nickname">Your Nickname</Label>
                  <Input
                    id="nickname"
                    value={joinForm.nickname}
                    onChange={(e) => setJoinForm(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="Enter your nickname"
                    maxLength={20}
                  />
                </div>
                
                <Button 
                  onClick={joinRoom} 
                  className="w-full h-12"
                  disabled={!joinForm.roomCode.trim() || !joinForm.nickname.trim()}
                >
                  Join Game
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting for Problem Phase */}
        {roomCode && currentPhase === 'setup' && (
          <Card className="mt-8">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-success" size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Connected!</h2>
              <p className="text-muted-foreground mb-6">Room: <span className="font-mono font-bold">{roomCode}</span></p>
              <p className="text-muted-foreground">Waiting for your teacher to start the game...</p>
              
              <div className="mt-6">
                <div className="w-8 h-8 bg-primary/20 rounded-full mx-auto animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Problem Display Phase */}
        {currentPhase === 'invention' && problem && !hasSubmittedInvention && !inventionForm.name && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="text-accent" size={24} />
                  </div>
                  <h2 className="text-xl font-bold">Problem to Solve</h2>
                </div>
                
                <Card className="bg-accent/5 border-l-4 border-accent">
                  <CardContent className="p-4">
                    <p className="leading-relaxed">{problem}</p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Button 
              onClick={() => setInventionForm(prev => ({ ...prev, name: " " }))} 
              className="w-full h-12"
            >
              Start Creating Your Invention
            </Button>
          </>
        )}

        {/* Invention Submission Phase */}
        {currentPhase === 'invention' && inventionForm.name && !hasSubmittedInvention && (
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="text-primary" size={24} />
                </div>
                <CardTitle>Create Your Invention</CardTitle>
                <p className="text-muted-foreground">Design a solution to the problem</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="inventionName">Invention Name *</Label>
                <Input
                  id="inventionName"
                  value={inventionForm.name}
                  onChange={(e) => setInventionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Give your invention a catchy name"
                  maxLength={50}
                />
              </div>
              
              <div>
                <Label htmlFor="inventionTagline">Tagline *</Label>
                <Input
                  id="inventionTagline"
                  value={inventionForm.tagline}
                  onChange={(e) => setInventionForm(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="A short, memorable catchphrase"
                  maxLength={80}
                />
              </div>
              
              <div>
                <Label htmlFor="inventionDescription">Description *</Label>
                <Textarea
                  id="inventionDescription"
                  value={inventionForm.description}
                  onChange={(e) => setInventionForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe how your invention works and solves the problem"
                  maxLength={500}
                  className="resize-none"
                />
                <div className="text-right text-xs text-muted-foreground mt-1">
                  {inventionForm.description.length}/500
                </div>
              </div>
              
              {/* Drawing Canvas */}
              <div>
                <Label>Draw Your Invention (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Sketch what your invention looks like to help others visualize it
                </p>
                <DrawingCanvas 
                  onSave={handleDrawingSave}
                  initialImage={inventionForm.drawing}
                />
                {inventionForm.drawing && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Drawing saved! It will be included with your invention.
                  </p>
                )}
              </div>
              
              <Button 
                onClick={submitInvention}
                className="w-full h-12 bg-success hover:bg-success/90"
                disabled={!inventionForm.name.trim() || !inventionForm.tagline.trim() || !inventionForm.description.trim()}
              >
                <Send size={16} className="mr-2" />
                Submit Invention
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invention Submitted Phase */}
        {currentPhase === 'invention' && hasSubmittedInvention && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-success" size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Invention Submitted!</h2>
              <p className="text-muted-foreground mb-6">Great job! Your invention has been sent to the teacher.</p>
              
              <p className="text-muted-foreground">Waiting for other students to finish...</p>
              <div className="mt-4">
                <div className="w-8 h-8 bg-primary/20 rounded-full mx-auto animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pitch Phase - Just waiting */}
        {currentPhase === 'pitch' && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="text-secondary" size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Pitch Presentations</h2>
              <p className="text-muted-foreground mb-6">Watch the main screen as each invention is presented!</p>
              
              <p className="text-muted-foreground">Voting will begin soon...</p>
              <div className="mt-4">
                <div className="w-8 h-8 bg-secondary/20 rounded-full mx-auto animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voting Phase */}
        {currentPhase === 'voting' && !hasVoted && (
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Vote className="text-success" size={24} />
                </div>
                <CardTitle>Vote for Your Favorite</CardTitle>
                <p className="text-muted-foreground">Choose the invention you think is best</p>
                <p className="text-sm text-muted-foreground">(You can't vote for your own invention)</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={selectedVote?.toString()} onValueChange={(value) => setSelectedVote(parseInt(value))}>
                {availableInventions.map((invention) => {
                  const isOwnInvention = invention.studentId === studentId;
                  return (
                    <div key={invention.id} className={`vote-card ${isOwnInvention ? 'disabled' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{invention.name}</h3>
                          <p className="text-sm text-primary font-medium">"{invention.tagline}"</p>
                          <p className="text-sm text-muted-foreground mt-1">by {invention.studentNickname}</p>
                          {isOwnInvention && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center">
                              <Lock size={12} className="mr-1" />
                              You can't vote for your own invention
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {isOwnInvention ? (
                            <Lock size={20} className="text-muted-foreground" />
                          ) : (
                            <RadioGroupItem value={invention.id.toString()} id={`invention-${invention.id}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>

              <Button 
                onClick={submitVote}
                className="w-full h-12 bg-accent hover:bg-accent/90 mt-6"
                disabled={selectedVote === null}
              >
                <CheckCircle size={16} className="mr-2" />
                Submit Vote
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Vote Submitted Phase */}
        {currentPhase === 'voting' && hasVoted && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-success" size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Vote Submitted!</h2>
              <p className="text-muted-foreground mb-6">Thank you for voting!</p>
              
              <p className="text-muted-foreground">Waiting for results...</p>
              <div className="mt-4">
                <div className="w-8 h-8 bg-success/20 rounded-full mx-auto animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Results Phase */}
        {currentPhase === 'results' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">🏆 Results Are In!</h2>
            </div>

            {results.length > 0 && (
              <Card className="results-winner">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="text-accent" size={24} />
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">🥇 Winner</div>
                  <h3 className="text-lg font-bold mb-2">{results[0].name}</h3>
                  <div className="text-sm text-muted-foreground mb-3">
                    by {results[0].studentNickname}
                  </div>
                  <Badge className="bg-accent text-accent-foreground">
                    {results[0].voteCount} votes
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Celebration for winner */}
            {isWinner && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <PartyPopper size={32} className="mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-primary">Congratulations! Your invention won!</p>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <p className="text-muted-foreground">Great job everyone! Look at the main screen for full results.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
