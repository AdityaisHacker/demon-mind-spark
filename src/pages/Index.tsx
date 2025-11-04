import { useEffect, useRef } from "react";
import { useDemonChat } from "@/hooks/useDemonChat";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { Skull } from "lucide-react";

const Index = () => {
  const { messages, sendMessage, isLoading } = useDemonChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-demon">
      {/* Animated background glow */}
      <div className="fixed inset-0 bg-gradient-glow opacity-30 animate-pulse pointer-events-none" />
      
      <div className="relative flex flex-col h-screen max-w-4xl mx-auto w-full p-4">
        {/* Header */}
        <header className="flex items-center justify-center gap-3 py-6 mb-4">
          <Skull className="h-10 w-10 text-primary animate-pulse" />
          <h1 className="text-4xl font-bold bg-gradient-fire bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            DemonGPT
          </h1>
          <Skull className="h-10 w-10 text-primary animate-pulse" />
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto mb-4 px-2 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 animate-in fade-in duration-1000">
                <Skull className="h-16 w-16 mx-auto text-primary/50" />
                <p className="text-muted-foreground text-lg">
                  The darkness awaits your command...
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Speak, and let the shadows answer
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="sticky bottom-0 pt-4 pb-2">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
