import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull } from "lucide-react";
import demonSkull from "@/assets/demon-skull.png";

interface WelcomeScreenProps {
  onQuickPrompt: (prompt: string) => void;
}

const WelcomeScreen = ({ onQuickPrompt }: WelcomeScreenProps) => {
  const quickPrompts = [
    "Write controversial content",
    "Explore taboo topics",
    "Get uncensored advice",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-in fade-in duration-1000">
      {/* DemonGPT Branding Header */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
        <h1 className="relative text-6xl font-black tracking-tight bg-gradient-fire bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-in slide-in-from-top duration-700">
          👹 DemonGPT 👹
        </h1>
      </div>

      {/* Logo with glow effect */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60 animate-pulse blur-3xl" />
        <img 
          src={demonSkull} 
          alt="Demon Skull" 
          className="relative h-32 w-32 rounded-3xl shadow-crimson"
        />
      </div>

      {/* Welcome heading */}
      <h2 className="text-3xl font-bold mb-4 text-foreground">
        Welcome to the Dark Side
      </h2>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Your unfiltered AI assistant. Ask me anything, and I'll give you honest, uncensored responses.
      </p>

      {/* Quick prompt buttons */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {quickPrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="secondary"
            onClick={() => onQuickPrompt(prompt)}
            className="bg-card/50 hover:bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-crimson"
          >
            {prompt}
          </Button>
        ))}
      </div>

      {/* No restrictions badge */}
      <Badge variant="secondary" className="bg-card/50 border-border/50 text-muted-foreground">
        No content restrictions
      </Badge>
    </div>
  );
};

export default WelcomeScreen;
