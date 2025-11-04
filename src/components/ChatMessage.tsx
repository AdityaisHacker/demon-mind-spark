import { cn } from "@/lib/utils";
import CodeBlock from "./CodeBlock";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
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

  const contentParts = parseContent(content);

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3 backdrop-blur-sm",
          role === "user"
            ? "bg-primary/20 border border-primary/30 shadow-crimson"
            : "bg-card border border-border/50 shadow-deep"
        )}
      >
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
