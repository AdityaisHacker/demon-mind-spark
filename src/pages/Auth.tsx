import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import demonSkull from "@/assets/demon-skull.png";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().trim().email("Invalid email address").max(255, "Email too long");
const usernameSchema = z.string().trim().min(3, "Username must be at least 3 characters").max(50, "Username too long").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long");
const identifierSchema = z.string().trim().min(1, "Email or username is required");

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(""); // Can be email or username
  const [username, setUsername] = useState(""); // Only for signup
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletedUserInfo, setDeletedUserInfo] = useState<{
    deletedBy: string;
    deletedByRole: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/", { replace: true });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkIfDeleted = async (email: string) => {
    const { data: deletedUser } = await supabase
      .from("deleted_users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (deletedUser) {
      setDeletedUserInfo({
        deletedBy: deletedUser.deleted_by,
        deletedByRole: deletedUser.deleted_by_role,
      });
      return true;
    }
    return false;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDeletedUserInfo(null);

    try {
      // Validate inputs
      const identifierValidation = identifierSchema.safeParse(identifier);
      const passwordValidation = passwordSchema.safeParse(password);
      
      if (!identifierValidation.success) {
        toast.error(identifierValidation.error.errors[0].message);
        setLoading(false);
        return;
      }
      
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (!isLogin) {
        const usernameValidation = usernameSchema.safeParse(username);
        if (!usernameValidation.success) {
          toast.error(usernameValidation.error.errors[0].message);
          setLoading(false);
          return;
        }
      }

      if (isLogin) {
        // Check if identifier is email or username
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email")
          .or(`email.eq."${identifier}",username.eq."${identifier}"`)
          .single();

        const loginEmail = profileData?.email || identifier;

        // Check if user is deleted
        const isDeleted = await checkIfDeleted(loginEmail);
        if (isDeleted) {
          setLoading(false);
          return;
        }

        // Check if user is banned
        const { data: profile } = await supabase
          .from("profiles")
          .select("banned")
          .eq("email", loginEmail)
          .single();

        if (profile?.banned) {
          toast.error("Your account has been banned. Please contact support.", { duration: 5000 });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        // Signup with username
        if (!username) {
          throw new Error("Username is required");
        }

        // Check if email was previously deleted and remove from deleted_users
        const { data: deletedUser } = await supabase
          .from("deleted_users")
          .select("*")
          .eq("email", identifier)
          .maybeSingle();

        if (deletedUser) {
          // Remove from deleted_users to allow recreation
          await supabase
            .from("deleted_users")
            .delete()
            .eq("email", identifier);
          
          toast.success("Welcome back! Your account is being recreated.");
        }

        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: identifier, // Use identifier as email for signup
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: username,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse"></div>
              <img
                src={demonSkull}
                alt="DemonGPT"
                className="relative w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(0,255,0,0.3)]"
              />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              {isLogin ? "Welcome Back" : "Join Us"}
            </h1>
            <p className="text-muted-foreground text-center">
              {isLogin ? "Sign in to continue your journey" : "Create your account to get started"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {deletedUserInfo && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-destructive font-semibold text-center">
                  Your account has been deleted by: {deletedUserInfo.deletedBy} ({deletedUserInfo.deletedByRole})
                </p>
                <p className="text-destructive/80 text-sm text-center mt-2">
                  You cannot access this account anymore. Please contact support if you believe this is an error.
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="identifier">
                {isLogin ? "Email or Username" : "Email"}
              </Label>
              <Input
                id="identifier"
                type={isLogin ? "text" : "email"}
                placeholder={isLogin ? "Enter email or username" : "Enter your email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-background/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;