import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Plus, 
  Shield, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MoreVertical,
  Edit,
  User,
  Skull,
  Ghost,
  Flame,
  Zap,
  Star,
  Heart,
  Search,
  Gift,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProfileSettingsDialog } from "./ProfileSettingsDialog";

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
  onClearHistory?: () => void;
  onRenameChat?: (chatId: string, newTitle: string) => void;
}

export function AppSidebar({ 
  currentChatId, 
  onNewChat, 
  onSelectChat, 
  chats,
  onDeleteChat,
  onClearHistory,
  onRenameChat,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [creditTier, setCreditTier] = useState<string>("Free");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserEmail(session.user.email || "");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roleData);

    // @ts-ignore - Avoid deep type instantiation
    const profileResponse = await supabase
      .from("profiles")
      .select("credits, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileResponse.data) {
      const credits = profileResponse.data.credits || 0;
      setAvatarUrl(profileResponse.data.avatar_url || null);
      if (credits >= 1000) {
        setCreditTier("Premium");
      } else if (credits >= 500) {
        setCreditTier("Pro");
      } else {
        setCreditTier("Free");
      }
    }
  };

  // Check admin status and fetch user data
  useEffect(() => {
    fetchUserData();
  }, []);

  const handleProfileClose = (open: boolean) => {
    setProfileSettingsOpen(open);
    if (!open) {
      // Refresh user data when dialog closes
      fetchUserData();
    }
  };

  const todayChats = chats.filter(chat => {
    const today = new Date().setHours(0, 0, 0, 0);
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    return chat.timestamp >= today && matchesSearch;
  });

  const yesterdayChats = chats.filter(chat => {
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 24 * 60 * 60 * 1000;
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    return chat.timestamp >= yesterday && chat.timestamp < today && matchesSearch;
  });

  const olderChats = chats.filter(chat => {
    const yesterday = new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000;
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase());
    return chat.timestamp < yesterday && matchesSearch;
  });

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-sm border-r border-border/50 transition-all duration-300 flex flex-col z-40",
        collapsed ? "w-0 md:w-16" : "w-64"
      )}
    >
      {/* Collapse Toggle - Centered */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 h-6 w-6 rounded-full bg-card border border-border/50 hover:bg-muted hidden md:flex"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {!collapsed && (
        <>
          {/* Header spacing */}
          <div className="h-16" />
          
          {/* New Chat Button */}
          <div className="p-3 space-y-3">
            <Button
              onClick={onNewChat}
              className="w-full justify-center gap-2 bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>

            {/* Clear All Button */}
            <Button
              onClick={() => {
                if (confirm("Are you sure you want to delete all chat history?")) {
                  onClearHistory?.();
                }
              }}
              variant="outline"
              className="w-full justify-center gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/50 border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Chat History */}
          <ScrollArea className="flex-1 px-3">
            {/* Today's Chats */}
            {todayChats.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                  TODAY
                </h3>
                {todayChats.map((chat) => (
                  <div 
                    key={chat.id}
                    className={cn(
                      "group relative flex items-center gap-2 mb-2 p-3 rounded-2xl transition-all duration-300 cursor-pointer animate-fade-in hover-scale",
                      currentChatId === chat.id 
                        ? "bg-primary/20 border border-primary/30 shadow-lg shadow-primary/20" 
                        : "bg-card/80 hover:bg-card/90 border border-border/30"
                    )}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <MessageSquare className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      currentChatId === chat.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "flex-1 truncate text-sm transition-colors max-w-[120px]",
                      currentChatId === chat.id ? "text-primary font-medium" : "text-foreground"
                    )}>
                      {chat.title}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this chat?")) {
                            onDeleteChat?.(chat.id);
                          }
                        }}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditTitle(chat.title);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this chat?")) {
                                onDeleteChat?.(chat.id);
                              }
                            }}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Yesterday's Chats */}
            {yesterdayChats.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                  YESTERDAY
                </h3>
                {yesterdayChats.map((chat) => (
                  <div 
                    key={chat.id}
                    className={cn(
                      "group relative flex items-center gap-2 mb-2 p-3 rounded-2xl transition-all duration-300 cursor-pointer animate-fade-in hover-scale",
                      currentChatId === chat.id 
                        ? "bg-primary/20 border border-primary/30 shadow-lg shadow-primary/20" 
                        : "bg-card/80 hover:bg-card/90 border border-border/30"
                    )}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <MessageSquare className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      currentChatId === chat.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "flex-1 truncate text-sm transition-colors max-w-[120px]",
                      currentChatId === chat.id ? "text-primary font-medium" : "text-foreground"
                    )}>
                      {chat.title}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this chat?")) {
                            onDeleteChat?.(chat.id);
                          }
                        }}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditTitle(chat.title);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this chat?")) {
                                onDeleteChat?.(chat.id);
                              }
                            }}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Older Chats */}
            {olderChats.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                  OLDER
                </h3>
                {olderChats.map((chat) => (
                  <div 
                    key={chat.id}
                    className={cn(
                      "group relative flex items-center gap-2 mb-2 p-3 rounded-2xl transition-all duration-300 cursor-pointer animate-fade-in hover-scale",
                      currentChatId === chat.id 
                        ? "bg-primary/20 border border-primary/30 shadow-lg shadow-primary/20" 
                        : "bg-card/80 hover:bg-card/90 border border-border/30"
                    )}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <MessageSquare className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      currentChatId === chat.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "flex-1 truncate text-sm transition-colors max-w-[120px]",
                      currentChatId === chat.id ? "text-primary font-medium" : "text-foreground"
                    )}>
                      {chat.title}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this chat?")) {
                            onDeleteChat?.(chat.id);
                          }
                        }}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChatId(chat.id);
                              setEditTitle(chat.title);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this chat?")) {
                                onDeleteChat?.(chat.id);
                              }
                            }}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No chats message */}
            {todayChats.length === 0 && yesterdayChats.length === 0 && olderChats.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "No chats found" : "No chats yet"}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-2" />

          {/* Bottom Menu */}
          <div className="p-3 space-y-2">
            {/* User Profile Section */}
            <button
              onClick={() => setProfileSettingsOpen(true)}
              className="w-full p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3 hover:bg-card/90 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarUrl && !avatarUrl.startsWith("icon:") ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="h-full w-full object-cover"
                  />
                ) : avatarUrl?.startsWith("icon:") ? (
                  (() => {
                    const iconName = avatarUrl.replace("icon:", "");
                    const iconMap: Record<string, any> = {
                      "User": User,
                      "Skull": Skull,
                      "Ghost": Ghost,
                      "Flame": Flame,
                      "Zap": Zap,
                      "Star": Star,
                      "Heart": Heart,
                    };
                    const IconComponent = iconMap[iconName] || User;
                    return <IconComponent className="h-5 w-5 text-primary" />;
                  })()
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate text-foreground">
                  {userEmail.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {creditTier}
                </p>
              </div>
            </button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sm hover:bg-card/50"
            >
              <Gift className="h-4 w-4" />
              <span>Referral</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sm hover:bg-card/50"
            >
              <CreditCard className="h-4 w-4" />
              <span>Upgrade Plan</span>
            </Button>

            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
              variant="ghost"
              className="w-full justify-start gap-3 text-sm hover:bg-card/50"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>

            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                variant="ghost"
                className="w-full justify-start gap-3 text-sm hover:bg-card/50 mt-2"
              >
                <Shield className="h-4 w-4" />
                <span>Admin Panel</span>
              </Button>
            )}
          </div>
        </>
      )}

      {/* Edit Chat Dialog */}
      <Dialog open={editingChatId !== null} onOpenChange={() => setEditingChatId(null)}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Enter new chat title"
            className="bg-background"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingChatId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingChatId && editTitle.trim()) {
                  onRenameChat?.(editingChatId, editTitle.trim());
                  setEditingChatId(null);
                  toast.success("Chat renamed");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog 
        open={profileSettingsOpen} 
        onOpenChange={handleProfileClose}
      />
    </div>
  );
}
