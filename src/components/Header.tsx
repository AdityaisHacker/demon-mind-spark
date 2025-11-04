import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull, Settings, LogOut, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import SettingsDialog from "./SettingsDialog";

const Header = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userData, setUserData] = useState<{ username: string; status: string }>({ 
    username: "", 
    status: "free" 
  });

  useEffect(() => {
    checkAdmin();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setUserData({
          username: profile.username || user.email?.split("@")[0] || "User",
          status: profile.status || "free",
        });
      }
    }
  };

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Skull className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-fire bg-clip-text text-transparent">
                DemonGPT
              </h1>
              <p className="text-xs text-muted-foreground">
                POWERED BY <span className="text-primary font-semibold">DEEPSEEK</span>
              </p>
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            {/* User Profile */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors border border-border/50"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Skull className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium">{userData.username}</div>
                <div className="text-xs text-muted-foreground capitalize">{userData.status}</div>
              </div>
            </button>

            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                variant="outline"
                size="sm"
                className="border-border/50 hover:border-primary/50"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-border/50 hover:border-primary/50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
};

export default Header;