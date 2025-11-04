import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export const useChatPersistence = (userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history when user logs in
  useEffect(() => {
    if (userId) {
      loadChatHistory();
    } else {
      setMessages([]);
    }
  }, [userId]);

  const loadChatHistory = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data as Message[]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast.error("Failed to load chat history");
    }
  };

  const saveMessage = async (message: Message) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: userId,
        role: message.role,
        content: message.content,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving message:", error);
      // Don't show error to user, just log it
    }
  };

  const clearHistory = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setMessages([]);
      toast.success("Chat history cleared");
    } catch (error) {
      console.error("Error clearing history:", error);
      toast.error("Failed to clear chat history");
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    saveMessage,
    clearHistory,
  };
};