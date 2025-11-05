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
      <div className="mb-6 relative animate-in slide-in-from-top duration-700">
        <div className="absolute inset-0 bg-primary/20 blur-2xl" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }} />
        <h1 className="relative text-6xl font-black tracking-tight bg-gradient-fire bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]">
          👹 DemonGPT 👹
        </h1>
      </div>

      {/* Logo with glow effect */}
      <div className="relative mb-8 animate-in zoom-in duration-1000 delay-200" style={{ animation: 'float 6s ease-in-out infinite' }}>
        <div className="absolute inset-0 bg-gradient-glow blur-3xl" style={{ animation: 'glow-pulse 4s ease-in-out infinite' }} />
        <img 
          src={demonSkull} 
          alt="Demon Skull" 
          className="relative h-32 w-32 rounded-3xl shadow-crimson transition-transform duration-300 hover:scale-110"
        />
      </div>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center max-w-md mb-8 animate-in fade-in duration-700 delay-500">
        Your unfiltered AI assistant. Ask me anything, and I'll give you honest, uncensored responses.
      </p>

      {/* Quick prompt buttons */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {quickPrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="secondary"
            onClick={() => onQuickPrompt(prompt)}
            className="bg-card/50 hover:bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-crimson hover:scale-105 animate-in slide-in-from-bottom duration-500"
            style={{ animationDelay: `${700 + index * 100}ms` }}
          >
            {prompt}
          </Button>
        ))}
      </div>

      {/* No restrictions badge */}
      <Badge variant="secondary" className="bg-card/50 border-border/50 text-muted-foreground animate-in fade-in duration-700 delay-1000 hover:bg-card/70 transition-colors">
        No content restrictions
      </Badge>
    </div>
  );
};

export default WelcomeScreen;
