import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Plus, 
  User, 
  Shield, 
  Award, 
  CreditCard, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  timestamp: number;
}

interface AppSidebarProps {
  currentChatId: string;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  chats: Chat[];
  onDeleteChat?: (chatId: string) => void;
}

export function AppSidebar({ 
  currentChatId, 
  onNewChat, 
  onSelectChat, 
  chats,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const todayChats = chats.filter(chat => {
    const today = new Date().setHours(0, 0, 0, 0);
    return chat.timestamp >= today;
  });

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-sm border-r border-border/50 transition-all duration-300 flex flex-col z-40",
        collapsed ? "w-0 md:w-16" : "w-64"
      )}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full bg-card border border-border/50 hover:bg-muted hidden md:flex"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {!collapsed && (
        <>
          {/* Header spacing */}
          <div className="h-16" />
          
          {/* New Chat Button */}
          <div className="p-3">
            <Button
              onClick={onNewChat}
              className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <ScrollArea className="flex-1 px-3">
            {todayChats.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                  TODAY
                </h3>
                {todayChats.map((chat) => (
                  <Button
                    key={chat.id}
                    variant="ghost"
                    onClick={() => onSelectChat(chat.id)}
                    className={cn(
                      "w-full justify-start gap-2 mb-1 text-sm",
                      currentChatId === chat.id && "bg-muted text-primary"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{chat.title}</span>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-2" />

          {/* Bottom Menu */}
          <div className="p-3 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
            >
              <Award className="h-4 w-4" />
              <span>Affiliate Program</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span>Upgrade Plan</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
