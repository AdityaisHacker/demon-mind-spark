import { useState, useEffect, useRef } from "react";
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
import { User, Mail, Award, Upload, Skull, Ghost, Flame, Zap, Star, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREDEFINED_ICONS = [
  { name: "User", icon: User, color: "text-blue-500" },
  { name: "Skull", icon: Skull, color: "text-red-500" },
  { name: "Ghost", icon: Ghost, color: "text-purple-500" },
  { name: "Flame", icon: Flame, color: "text-orange-500" },
  { name: "Zap", icon: Zap, color: "text-yellow-500" },
  { name: "Star", icon: Star, color: "text-pink-500" },
  { name: "Heart", icon: Heart, color: "text-rose-500" },
];

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [unlimited, setUnlimited] = useState(false);
  const [creditTier, setCreditTier] = useState("Free");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>("User");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .select("username, credits, unlimited, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResponse.data) {
      const profileCredits = profileResponse.data.credits || 0;
      const isUnlimited = profileResponse.data.unlimited || false;
      setUsername(profileResponse.data.username || "");
      setCredits(profileCredits);
      setUnlimited(isUnlimited);
      setAvatarUrl(profileResponse.data.avatar_url || null);
      
      // If avatar_url starts with "icon:", it's a predefined icon
      if (profileResponse.data.avatar_url?.startsWith("icon:")) {
        setSelectedIcon(profileResponse.data.avatar_url.replace("icon:", ""));
      }

      if (isUnlimited) {
        setCreditTier("Unlimited");
      } else if (profileCredits >= 1000) {
        setCreditTier("Premium");
      } else if (profileCredits >= 500) {
        setCreditTier("Pro");
      } else {
        setCreditTier("Free");
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload image");
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    setUploading(false);
    toast.success("Image uploaded successfully");
  };

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    setAvatarUrl(`icon:${iconName}`);
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
      .update({ 
        username: username.trim(),
        avatar_url: avatarUrl 
      })
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
          {/* Profile Icon Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Icon
            </Label>
            
            {/* Current Avatar Preview */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                {avatarUrl && !avatarUrl.startsWith("icon:") ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  (() => {
                    const IconComponent = PREDEFINED_ICONS.find(i => i.name === selectedIcon)?.icon || User;
                    const iconColor = PREDEFINED_ICONS.find(i => i.name === selectedIcon)?.color || "text-primary";
                    return <IconComponent className={cn("h-8 w-8", iconColor)} />;
                  })()
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Current Icon</p>
                <p className="text-xs text-muted-foreground">Choose from icons or upload custom</p>
              </div>
            </div>

            {/* Predefined Icons */}
            <div className="grid grid-cols-7 gap-2">
              {PREDEFINED_ICONS.map((iconData) => {
                const IconComponent = iconData.icon;
                const isSelected = selectedIcon === iconData.name && avatarUrl?.startsWith("icon:");
                return (
                  <button
                    key={iconData.name}
                    type="button"
                    onClick={() => handleIconSelect(iconData.name)}
                    className={cn(
                      "h-12 w-12 rounded-lg flex items-center justify-center transition-all",
                      isSelected 
                        ? "bg-primary/30 border-2 border-primary ring-2 ring-primary/50" 
                        : "bg-card border border-border/50 hover:bg-card/80 hover:border-primary/30"
                    )}
                  >
                    <IconComponent className={cn("h-6 w-6", iconData.color)} />
                  </button>
                );
              })}
            </div>

            {/* Custom Upload */}
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Custom Image"}
              </Button>
            </div>
          </div>

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
                    {unlimited ? "∞ Unlimited credits" : `${credits} credits available`}
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
