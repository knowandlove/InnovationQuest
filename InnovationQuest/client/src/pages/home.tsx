import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Presentation, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="text-white text-2xl" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Innovation Station</h1>
            <p className="text-muted-foreground">Classroom Edition</p>
          </div>
          
          <div className="space-y-4">
            <Link href="/teacher">
              <Button className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white font-medium text-lg">
                <Presentation className="mr-3" size={20} />
                Teacher / Main Screen
              </Button>
            </Link>
            
            <Link href="/student">
              <Button className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-medium text-lg">
                <GraduationCap className="mr-3" size={20} />
                Student Device
              </Button>
            </Link>
          </div>
          
          <Card className="mt-8 bg-muted">
            <CardContent className="p-4">
              <h3 className="font-medium text-foreground mb-2">How to Play:</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Teacher creates a game room</li>
                <li>Students join with room code</li>
                <li>Teacher sets the problem to solve</li>
                <li>Students submit their inventions</li>
                <li>Present ideas and vote for favorites</li>
              </ol>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
