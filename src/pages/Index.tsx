import { useEffect, useRef, useState } from "react";
import { useDemonChat } from "@/hooks/useDemonChat";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Header from "@/components/Header";
import WelcomeScreen from "@/components/WelcomeScreen";
import { AppSidebar } from "@/components/AppSidebar";

interface Chat {
  id: string;
  title: string;
  timestamp: number;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const Index = () => {
  const { messages, sendMessage, isLoading, stopGeneration } = useDemonChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem("demon-chats");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    return localStorage.getItem("current-chat-id") || "";
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem("demon-chats", JSON.stringify(chats));
  }, [chats]);

  // Save current chat ID
  useEffect(() => {
    localStorage.setItem("current-chat-id", currentChatId);
  }, [currentChatId]);

  // Update current chat with new messages
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages,
              title: messages[0]?.content.slice(0, 30) || "New Chat"
            }
          : chat
      ));
    }
  }, [messages, currentChatId]);

  const handleNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      timestamp: Date.now(),
      messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    window.location.reload(); // Refresh to clear messages
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    const selectedChat = chats.find(c => c.id === chatId);
    if (selectedChat) {
      // This would require restructuring useDemonChat to accept initial messages
      window.location.reload();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="flex min-h-screen bg-gradient-demon">
      {/* Animated background glow */}
      <div className="fixed inset-0 bg-gradient-glow opacity-20 animate-pulse pointer-events-none" />
      
      {/* Sidebar */}
      <AppSidebar
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        chats={chats}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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
            <ChatInput 
              onSend={sendMessage} 
              onStop={stopGeneration}
              isLoading={isLoading} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
