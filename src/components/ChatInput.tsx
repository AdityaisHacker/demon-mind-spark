import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
}

const ChatInput = ({ onSend, onStop, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message DemonGPT..."
        className="pr-12 h-12 bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/30 shadow-deep transition-all"
        disabled={isLoading}
      />
      <Button
        type={isLoading ? "button" : "submit"}
        size="icon"
        disabled={!isLoading && !input.trim()}
        onClick={isLoading ? onStop : undefined}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-primary hover:bg-primary/90 shadow-crimson transition-all hover:scale-105"
      >
        {isLoading ? (
          <Square className="h-4 w-4" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};

export default ChatInput;
