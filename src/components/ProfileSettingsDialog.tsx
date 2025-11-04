import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Award } from "lucide-react";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [creditTier, setCreditTier] = useState("Free");

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || "");

    // @ts-ignore - Avoid deep type instantiation
    const profileResponse = await supabase
      .from("profiles")
      .select("username, credits")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResponse.data) {
      const profileCredits = profileResponse.data.credits || 0;
      setUsername(profileResponse.data.username || "");
      setCredits(profileCredits);

      if (profileCredits >= 1000) {
        setCreditTier("Premium");
      } else if (profileCredits >= 500) {
        setCreditTier("Pro");
      } else {
        setCreditTier("Free");
      }
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="bg-background"
            />
          </div>

          {/* Credits Info */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Credit Tier
            </Label>
            <div className="p-4 rounded-lg bg-card border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{creditTier}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {credits} credits available
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
