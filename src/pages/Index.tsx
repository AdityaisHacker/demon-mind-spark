import { useEffect, useRef } from "react";
import { useDemonChat } from "@/hooks/useDemonChat";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Header from "@/components/Header";
import WelcomeScreen from "@/components/WelcomeScreen";

const Index = () => {
  const { messages, sendMessage, isLoading } = useDemonChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-demon">
      {/* Animated background glow */}
      <div className="fixed inset-0 bg-gradient-glow opacity-20 animate-pulse pointer-events-none" />
      
      {/* Header */}
      <Header />

      <div className="relative flex flex-col flex-1 max-w-5xl mx-auto w-full pt-20 pb-4 px-4">
        {/* Chat Messages or Welcome Screen */}
        <div className="flex-1 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <WelcomeScreen onQuickPrompt={handleQuickPrompt} />
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
        <div className="sticky bottom-0 pt-4 pb-2 max-w-3xl mx-auto w-full">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
