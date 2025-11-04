import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Database, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "general" | "profile" | "data" | "about";

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadUserData();
    }
  }, [open]);

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setUserName(profile.username || "");
      setUserEmail(profile.email || "");
    }
  };

  const handleLogoutAll = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out from all devices");
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    toast.error("Account deletion will be implemented soon");
  };

  const tabs = [
    { id: "general" as SettingsTab, label: "General", icon: Settings },
    { id: "profile" as SettingsTab, label: "Profile", icon: User },
    { id: "data" as SettingsTab, label: "Data", icon: Database },
    { id: "about" as SettingsTab, label: "About", icon: FileText },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0 gap-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-secondary/30 border-r border-border p-4">
            <DialogHeader className="mb-6">
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === tab.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-4">Profile Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{userName || "-"}</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Email address</span>
                      <span className="text-sm">{userEmail}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Phone number</span>
                      <span className="text-sm">-</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-sm font-medium mb-4">Account Actions</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Log out of all devices</span>
                      <Button
                        onClick={handleLogoutAll}
                        variant="outline"
                        size="sm"
                        className="border-primary/50 text-primary hover:bg-primary/10"
                      >
                        Log out
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-muted-foreground">Delete account</span>
                      <Button
                        onClick={handleDeleteAccount}
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "general" && (
              <div>
                <h3 className="text-sm font-medium mb-4">General Settings</h3>
                <p className="text-sm text-muted-foreground">General settings will be available soon.</p>
              </div>
            )}

            {activeTab === "data" && (
              <div>
                <h3 className="text-sm font-medium mb-4">Data Management</h3>
                <p className="text-sm text-muted-foreground">Data management options will be available soon.</p>
              </div>
            )}

            {activeTab === "about" && (
              <div>
                <h3 className="text-sm font-medium mb-4">About DemonGPT</h3>
                <p className="text-sm text-muted-foreground">DemonGPT - Powered by DeepSeek AI</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
