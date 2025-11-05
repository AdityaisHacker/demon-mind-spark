import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull } from "lucide-react";
import demonSkull from "@/assets/demon-skull.png";
import { useEffect, useState } from "react";

interface WelcomeScreenProps {
  onQuickPrompt: (prompt: string) => void;
}

const WelcomeScreen = ({ onQuickPrompt }: WelcomeScreenProps) => {
  const [embers, setEmbers] = useState<Array<{ id: number; left: number; delay: number; duration: number; drift: number }>>([]);
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "Welcome to DemonGPT";

  useEffect(() => {
    // Create 15 floating embers with random positions and timings
    const emberArray = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
      drift: (Math.random() - 0.5) * 100,
    }));
    setEmbers(emberArray);

    // Typing animation
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, []);
  const quickPrompts = [
    "Write controversial content",
    "Explore taboo topics",
    "Get uncensored advice",
  ];


  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-in fade-in duration-1000 relative overflow-hidden">
      {/* Floating embers background */}
      <div className="absolute inset-0 pointer-events-none">
        {embers.map((ember) => (
          <div
            key={ember.id}
            className="ember"
            style={{
              left: `${ember.left}%`,
              animationDelay: `${ember.delay}s`,
              animationDuration: `${ember.duration}s`,
              '--drift': `${ember.drift}px`,
            } as React.CSSProperties & { '--drift': string }}
          />
        ))}
      </div>

      {/* Logo with enhanced glow effect */}
      <div className="relative mb-8 animate-in zoom-in duration-1000 delay-200 z-10" style={{ animation: 'float 6s ease-in-out infinite' }}>
        <div className="absolute inset-0 bg-gradient-glow blur-[60px] opacity-80" style={{ animation: 'glow-pulse 4s ease-in-out infinite' }} />
        <div className="absolute inset-0 bg-primary/40 blur-3xl animate-pulse" />
        <img 
          src={demonSkull} 
          alt="Demon Skull" 
          className="relative h-48 w-48 rounded-3xl shadow-[0_0_60px_rgba(239,68,68,0.6)] transition-transform duration-300 hover:scale-110"
        />
      </div>

      {/* Welcome to DemonGPT Heading with Typing Animation */}
      <div className="mb-6 relative animate-in slide-in-from-top duration-700 z-10">
        <div className="absolute inset-0 bg-primary/20 blur-2xl" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }} />
        <h1 className="relative text-6xl md:text-7xl font-black tracking-tight bg-gradient-fire bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]">
          {displayedText}
          {displayedText.length < fullText.length && (
            <span className="inline-block w-1 h-16 md:h-20 ml-2 bg-primary animate-pulse" />
          )}
        </h1>
      </div>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center max-w-md mb-8 animate-in fade-in duration-700 delay-500 z-10">
        Your unfiltered AI assistant. Ask me anything, and I'll give you honest, uncensored responses.
      </p>

      {/* Quick prompt buttons */}
      <div className="flex flex-wrap gap-3 justify-center mb-6 z-10">
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
      <Badge variant="secondary" className="bg-card/50 border-border/50 text-muted-foreground animate-in fade-in duration-700 delay-1000 hover:bg-card/70 transition-colors z-10">
        No content restrictions
      </Badge>
    </div>
  );
};

export default WelcomeScreen;
