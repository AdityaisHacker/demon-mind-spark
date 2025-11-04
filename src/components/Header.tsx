import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull, Settings, LogOut, Shield, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import SettingsDialog from "./SettingsDialog";

const Header = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchCredits();

    // Subscribe to profile changes to update credits in real-time
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const fetchCredits = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits, unlimited")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setCredits(profile.credits || 0);
      setIsUnlimited(profile.unlimited || false);
    }
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
            {/* Credits Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/60 border border-border/50">
              <Coins className="h-4 w-4 text-primary" />
              {isUnlimited ? (
                <Badge variant="secondary" className="text-xs font-semibold">
                  ∞ Unlimited
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{credits}</span>
                  <span className="text-xs text-muted-foreground">credits</span>
                  {credits === 0 && (
                    <Badge variant="destructive" className="text-xs ml-1">
                      No Credits
                    </Badge>
                  )}
                  {credits > 0 && credits < 10 && (
                    <Badge variant="outline" className="text-xs ml-1 border-yellow-500 text-yellow-500">
                      Low
                    </Badge>
                  )}
                </div>
              )}
            </div>

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