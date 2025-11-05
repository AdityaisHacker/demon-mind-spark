import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square, Paperclip, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

const ChatInput = ({ onSend, onStop, isLoading, disabled = false, disabledMessage }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
      setAttachedImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-start gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 shadow-deep">
        {/* Left Icon */}
        <MessageSquare className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
        
        {/* Input Container */}
        <div className="flex-1 min-w-0">
          {attachedImage && (
            <div className="mb-2 relative inline-block">
              <img 
                src={attachedImage} 
                alt="Attached" 
                className="h-20 rounded-lg object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? (disabledMessage || "No credits available") : "Message DemonGPT..."}
            className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            disabled={isLoading || disabled}
            rows={1}
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 mt-2 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageAttach}
            className="hidden"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button
            type={isLoading ? "button" : "submit"}
            size="icon"
            disabled={disabled || (!isLoading && !input.trim())}
            onClick={isLoading ? onStop : undefined}
            className="h-8 w-8 bg-primary hover:bg-primary/90 shadow-crimson transition-all hover:scale-105"
          >
            {isLoading ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;
