import { Skull } from "lucide-react";

const ThinkingIndicator = () => {
  return (
    <div className="flex w-full mb-4 justify-start animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="max-w-[85%] rounded-lg px-4 py-3 backdrop-blur-sm bg-card border border-border/50 shadow-deep flex items-center gap-3">
        <Skull className="h-5 w-5 text-primary animate-pulse" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground font-medium">DEMON is thinking</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
