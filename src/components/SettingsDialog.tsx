import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, Database, Settings as SettingsIcon, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"general" | "profile" | "data" | "about">("general");
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({ name: "", email: "", phone: "" });
  const [improveModel, setImproveModel] = useState(true);

  useEffect(() => {
    if (open) {
      loadUserData();
    }
  }, [open]);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email")
        .eq("id", user.id)
        .single();

      setUserData({
        name: profile?.username || user.user_metadata?.name || "",
        email: profile?.email || user.email || "",
        phone: user.phone || "-",
      });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out from all devices");
      navigate("/auth");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete user data
          await supabase.from("chat_messages").delete().eq("user_id", user.id);
          await supabase.from("user_roles").delete().eq("user_id", user.id);
          await supabase.from("profiles").delete().eq("id", user.id);
          
          toast.success("Account deleted successfully");
          await supabase.auth.signOut();
          navigate("/auth");
          onOpenChange(false);
        }
      } catch (error) {
        toast.error("Failed to delete account");
      }
    }
  };

  const handleDeleteAllChats = async () => {
    if (confirm("Are you sure you want to delete all your chats? This action cannot be undone.")) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("chat_messages").delete().eq("user_id", user.id);
          toast.success("All chats deleted");
          // Force page reload to clear state
          setTimeout(() => {
            window.location.href = "/";
          }, 500);
        }
      } catch (error) {
        toast.error("Failed to delete chats");
      }
    }
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const exportData = {
          profile,
          messages,
          exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `demongpt-data-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Data exported successfully");
      }
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-48 bg-muted/30 border-r p-4 space-y-1">
            <DialogHeader className="px-2 pb-4">
              <DialogTitle className="text-lg">Settings</DialogTitle>
            </DialogHeader>
            
            <Button
              variant={activeTab === "general" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("general")}
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </Button>
            
            <Button
              variant={activeTab === "profile" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("profile")}
            >
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            
            <Button
              variant={activeTab === "data" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("data")}
            >
              <Database className="h-4 w-4 mr-2" />
              Data
            </Button>
            
            <Button
              variant={activeTab === "about" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("about")}
            >
              <Info className="h-4 w-4 mr-2" />
              About
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your general preferences and settings.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Profile</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Manage your account information
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{userData.name}</span>
                      {userData.email.includes("gmail") && (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-muted-foreground">Email address</span>
                    <span className="font-medium text-sm">
                      {userData.email.replace(/(.{4})(.*)(@.*)/, "$1*******$3")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <span className="text-sm text-muted-foreground">Phone number</span>
                    <span className="font-medium">{userData.phone}</span>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b">
                    <span className="text-sm text-muted-foreground">Log out of all devices</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogoutAll}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Log out
                    </Button>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-muted-foreground">Delete account</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAccount}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Data Controls</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Manage your data and privacy settings
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start justify-between py-4 border-b">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Improve the model for everyone</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow your content to be used to train our models and improve our services. We secure your data privacy.
                      </p>
                    </div>
                    <Switch
                      checked={improveModel}
                      onCheckedChange={setImproveModel}
                      className="ml-4"
                    />
                  </div>

                  <div className="flex items-center justify-between py-4 border-b">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Shared links</h4>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>

                  <div className="flex items-start justify-between py-4 border-b">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Export data</h4>
                      <p className="text-sm text-muted-foreground">
                        This data includes your account information and all chat history. Exporting may take some time. The download link will be valid for 7 days.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportData}
                      className="ml-4"
                    >
                      Export
                    </Button>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">Delete all chats</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAllChats}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Delete all
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">About DemonGPT</h3>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <p>
                      DemonGPT is powered by DeepSeek AI, providing you with powerful and intelligent conversations.
                    </p>
                    <div className="pt-4 border-t">
                      <p className="font-medium text-foreground mb-2">Version</p>
                      <p>1.0.0</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
