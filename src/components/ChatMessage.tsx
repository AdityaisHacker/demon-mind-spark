import { cn } from "@/lib/utils";
import CodeBlock from "./CodeBlock";
import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import demonSkull from "@/assets/demon-skull.png";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const [showThinking, setShowThinking] = useState(false);

  // Extract thinking and response parts
  const extractThinking = (text: string) => {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    const thinking = thinkMatch ? thinkMatch[1].trim() : null;
    const response = thinking ? text.replace(/<think>[\s\S]*?<\/think>/, '').trim() : text;
    return { thinking, response };
  };

  const { thinking, response } = role === "assistant" ? extractThinking(content) : { thinking: null, response: content };

  // Function to parse code blocks from markdown-style content
  const parseContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Add code block
      parts.push({
        type: "code",
        content: match[2].trim(),
        language: match[1] || "code",
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : [{ type: "text" as const, content: text }];
  };

  const contentParts = parseContent(response);

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 gap-3",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {/* Demon Avatar for Assistant */}
      {role === "assistant" && (
        <div className="flex-shrink-0 mt-1">
          <img 
            src={demonSkull} 
            alt="DemonGPT" 
            className="h-10 w-10 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)] opacity-90"
          />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3 backdrop-blur-sm",
          role === "user"
            ? "bg-primary/20 border border-primary/30 shadow-crimson"
            : "bg-card border border-border/50 shadow-deep"
        )}
      >
        {/* Thinking Section - Only for assistant with thinking */}
        {thinking && role === "assistant" && (
          <div className="mb-3 border-b border-border/30 pb-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Brain className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="font-medium">Demon Thinking...</span>
              {showThinking ? (
                <ChevronUp className="h-3.5 w-3.5 ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              )}
            </button>
            
            {showThinking && (
              <div className="mt-2 p-3 bg-background/50 rounded-md border border-primary/20 animate-in slide-in-from-top-1 duration-300">
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground italic">
                  {thinking}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Response */}
        {contentParts.map((part, index) =>
          part.type === "code" ? (
            <CodeBlock key={index} code={part.content} language={part.language} />
          ) : (
            <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
              {part.content}
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
