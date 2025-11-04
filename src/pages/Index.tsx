import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Header from "@/components/Header";
import WelcomeScreen from "@/components/WelcomeScreen";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import demonBg from "@/assets/demon-bg.png";
import demonBg1 from "@/assets/demon-bg-1.png";
import demonBg2 from "@/assets/demon-bg-2.png";
import demonBg3 from "@/assets/demon-bg-3.png";

interface Chat {
  id: string;
  title: string;
  timestamp: number;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { messages, setMessages, isLoading, setIsLoading, saveMessage, clearHistory } = useChatPersistence(user?.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Random background image
  const backgrounds = [demonBg, demonBg1, demonBg2, demonBg3];
  const [currentBg] = useState(() => backgrounds[Math.floor(Math.random() * backgrounds.length)]);
  
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem("demon-chats");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    return localStorage.getItem("current-chat-id") || "";
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  const handleNewChat = async () => {
    if (!user) return;
    
    // Clear current messages and create new chat
    setMessages([]);
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      timestamp: Date.now(),
      messages: [],
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    
    // Clear database chat history
    await clearHistory();
  };

  const handleDeleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId("");
    }
    toast.success("Chat deleted");
  };

  const handleClearAllHistory = async () => {
    await clearHistory();
    setMessages([]);
    setChats([]);
    setCurrentChatId("");
    toast.success("All chat history cleared");
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    ));
  };

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    const selectedChat = chats.find(c => c.id === chatId);
    if (selectedChat) {
      setMessages(selectedChat.messages);
    }
  };

  const sendMessage = async (input: string) => {
    if (!user) {
      toast.error("Please login to send messages");
      return;
    }

    // Create new chat if needed
    if (!currentChatId) {
      const newChatId = Date.now().toString();
      const newChat: Chat = {
        id: newChatId,
        title: input.slice(0, 30),
        timestamp: Date.now(),
        messages: [],
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
    }

    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    await saveMessage(userMessage);
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to get response from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                assistantMessage += content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.role === "assistant") {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  } else {
                    newMessages.push({ role: "assistant", content: assistantMessage });
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Save the complete assistant message
      if (assistantMessage) {
        await saveMessage({ role: "assistant", content: assistantMessage });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request was aborted");
      } else {
        console.error("Error:", error);
        toast.error("Failed to send message");
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-gradient-demon relative overflow-hidden">
      {/* Animated demon background */}
      <div 
        className="fixed inset-0 z-0 opacity-15 animate-pulse"
        style={{
          backgroundImage: `url(${currentBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(4px)',
        }}
      />
      
      {/* Animated background glow */}
      <div className="fixed inset-0 bg-gradient-glow opacity-20 animate-pulse pointer-events-none z-0" />
      
      {/* Sidebar - Fixed position */}
      <AppSidebar
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearHistory={handleClearAllHistory}
        onRenameChat={handleRenameChat}
        chats={chats}
      />

      {/* Main Content - With left margin for sidebar */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 ml-64">
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
