import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Download, Search, Users, DollarSign, Activity, CreditCard, UserCog, ShieldBan, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SetCreditsDialog } from "@/components/SetCreditsDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  credits: number;
  unlimited: boolean;
  status: string;
  banned: boolean;
  avatar_url: string | null;
  user_roles: Array<{ role: string }>;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
  metadata?: any;
}

interface DeletedUser {
  id: string;
  email: string;
  username: string | null;
  deleted_by: string;
  deleted_by_role: string;
  deleted_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<Profile[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [setCreditsDialogOpen, setSetCreditsDialogOpen] = useState(false);
  const [selectedUserForCredits, setSelectedUserForCredits] = useState<Profile | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<Profile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkCreditsAmount, setBulkCreditsAmount] = useState("");
  const [bulkStatus, setBulkStatus] = useState("free");

  useEffect(() => {
    if (authLoading || adminLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isAdmin) {
      toast.error("Access denied. Admin only.");
      navigate("/");
      return;
    }

    loadAdminData();
  }, [isAdmin, authLoading, adminLoading, user, navigate]);

  const loadAdminData = async () => {
    try {
      console.log("Loading admin data...");
      
      // Load users with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          username,
          created_at,
          credits,
          unlimited,
          status,
          banned,
          avatar_url,
          user_roles (role)
        `)
        .order("created_at", { ascending: false });

      console.log("Profiles data:", profilesData);
      console.log("Profiles error:", profilesError);

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        toast.error("Failed to load users: " + profilesError.message);
      } else if (profilesData) {
        setUsers(profilesData as any);
      }

      // Load login attempts (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("login_attempts")
        .select("*")
        .gte("created_at", oneDayAgo)
        .order("created_at", { ascending: false });

      if (attemptsError) {
        console.error("Error loading login attempts:", attemptsError);
      } else if (attemptsData) {
        setLoginAttempts(attemptsData);
      }

      // Load deleted users - don't block if it fails
      try {
        const { data: deletedData, error: deletedError } = await supabase
          .from("deleted_users")
          .select("*")
          .order("deleted_at", { ascending: false });

        if (deletedError) {
          console.error("Error loading deleted users:", deletedError);
          // Don't block page load if deleted users can't be loaded
        } else if (deletedData) {
          setDeletedUsers(deletedData);
        }
      } catch (err) {
        console.error("Failed to load deleted users:", err);
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast.error("Failed to load admin data");
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
      
      toast.success("User updated successfully");
      await loadAdminData();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleBanUser = async (userId: string, currentBanStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: !currentBanStatus })
        .eq("id", userId);

      if (error) throw error;
      
      toast.success(currentBanStatus ? "User unbanned successfully" : "User banned successfully");
      await loadAdminData();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }
      
      toast.success("User deleted successfully");
      await loadAdminData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleSetCredits = async (credits: number) => {
    if (!selectedUserForCredits) return;
    
    await handleUpdateUser(selectedUserForCredits.id, { credits });
    setSelectedUserForCredits(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // First, delete existing role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Then insert new role
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as any }]);

      if (insertError) throw insertError;
      
      toast.success(`Role updated to ${newRole}`);
      await loadAdminData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleRestoreUser = async (email: string) => {
    if (!confirm("Are you sure you want to allow this user to recreate their account?")) return;
    
    try {
      const { error } = await supabase
        .from("deleted_users")
        .delete()
        .eq("email", email);

      if (error) throw error;
      
      toast.success("User can now recreate their account");
      await loadAdminData();
    } catch (error) {
      console.error("Error restoring user:", error);
      toast.error("Failed to restore user");
    }
  };

  const exportUsers = () => {
    const csv = [
      ["Username", "Email", "Credits", "Status", "Role", "Unlimited", "Join Date"],
      ...users.map(u => [
        u.username || "",
        u.email,
        u.credits,
        u.status,
        u.user_roles?.[0]?.role || "user",
        u.unlimited ? "Yes" : "No",
        new Date(u.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAttempts = loginAttempts.length;
  const failedAttempts = loginAttempts.filter(a => !a.success).length;
  const activeUsers = users.filter(u => u.status !== 'free').length;
  const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleBulkCredits = async () => {
    const amount = parseInt(bulkCreditsAmount);
    if (isNaN(amount)) {
      toast.error("Please enter a valid number");
      return;
    }

    try {
      for (const userId of selectedUsers) {
        const currentUser = users.find(u => u.id === userId);
        if (!currentUser) continue;

        await supabase
          .from('profiles')
          .update({ credits: currentUser.credits + amount })
          .eq('id', userId);
      }

      toast.success(`Updated credits for ${selectedUsers.length} users`);
      setBulkCreditsAmount("");
      setSelectedUsers([]);
      await loadAdminData();
    } catch (error) {
      console.error("Error updating credits:", error);
      toast.error("Failed to update credits");
    }
  };

  const handleBulkStatus = async () => {
    try {
      for (const userId of selectedUsers) {
        await supabase
          .from('profiles')
          .update({ status: bulkStatus })
          .eq('id', userId);
      }

      toast.success(`Updated status for ${selectedUsers.length} users to ${bulkStatus}`);
      setSelectedUsers([]);
      await loadAdminData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleBulkBan = async () => {
    if (!confirm(`Are you sure you want to ban ${selectedUsers.length} users?`)) return;

    try {
      for (const userId of selectedUsers) {
        await supabase
          .from('profiles')
          .update({ banned: true })
          .eq('id', userId);
      }

      toast.success(`Banned ${selectedUsers.length} users`);
      setSelectedUsers([]);
      await loadAdminData();
    } catch (error) {
      console.error("Error banning users:", error);
      toast.error("Failed to ban users");
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      for (const userId of selectedUsers) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          }
        );
      }

      toast.success(`Deleted ${selectedUsers.length} users`);
      setSelectedUsers([]);
      await loadAdminData();
    } catch (error) {
      console.error("Error deleting users:", error);
      toast.error("Failed to delete users");
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/")} variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Admin Panel
            </h1>
          </div>
          <Button onClick={exportUsers} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="security">Security Monitoring</TabsTrigger>
            <TabsTrigger value="keys">Key Management</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                      <Users className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Users</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Credits</p>
                      <p className="text-2xl font-bold">{totalCredits}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                      <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Active Users</p>
                      <p className="text-2xl font-bold">{activeUsers}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Security Monitoring */}
            <Card className="p-6 bg-card/80 border-border/50">
              <h2 className="text-xl font-bold mb-4">Security Monitoring (Last 24 Hours)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-sm text-muted-foreground mb-1">Total Attempts</p>
                  <p className="text-3xl font-bold">{totalAttempts}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-sm text-muted-foreground mb-1">Failed Attempts</p>
                  <p className="text-3xl font-bold text-destructive">{failedAttempts}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-sm text-muted-foreground mb-1">Blocked IPs</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Login Attempts</h3>
                <ScrollArea className="h-[300px] rounded-lg border border-border/50 bg-background/30">
                  <div className="p-4 space-y-2">
                    {loginAttempts.slice(0, 10).map((attempt) => (
                      <div 
                        key={attempt.id}
                        className={`p-3 rounded-lg ${
                          attempt.success ? "bg-card/50" : "bg-destructive/10 border border-destructive/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant={attempt.success ? "default" : "destructive"} className="mt-1">
                            {attempt.success ? "SUCCESS" : "FAILED"}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{attempt.email}</p>
                            <p className="text-xs text-muted-foreground">IP: {attempt.ip_address || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              UA: {attempt.user_agent || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(attempt.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </Card>

            {/* Users Table */}
            <Card className="hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Users ({filteredUsers.length})</h2>
                    {selectedUsers.length > 0 && (
                      <Badge variant="secondary" className="text-sm px-2 py-1">
                        {selectedUsers.length} selected
                      </Badge>
                    )}
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search username or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  {/* Bulk Actions */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="±Credits"
                          value={bulkCreditsAmount}
                          onChange={(e) => setBulkCreditsAmount(e.target.value)}
                          className="w-24 h-8"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleBulkCredits}
                          className="h-8"
                        >
                          Credits
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-muted-foreground" />
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleBulkStatus}
                          className="h-8"
                        >
                          Status
                        </Button>
                      </div>

                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={handleBulkBan}
                        className="h-8 gap-1"
                      >
                        <ShieldBan className="w-4 h-4" />
                        Ban
                      </Button>

                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={handleBulkDelete}
                        className="h-8 gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/50">
                        <TableRow className="hover:bg-muted/50">
                          <TableHead className="w-10 pl-4">
                            <Checkbox
                              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-32">Username</TableHead>
                          <TableHead className="w-48">Email</TableHead>
                          <TableHead className="w-20">Credits</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-28">Subscription</TableHead>
                          <TableHead className="w-20">Role</TableHead>
                          <TableHead className="w-16">∞</TableHead>
                          <TableHead className="w-24">Joined</TableHead>
                          <TableHead className="w-40">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userRow) => (
                          <TableRow 
                            key={userRow.id}
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                          >
                            <TableCell onClick={(e) => e.stopPropagation()} className="pl-4">
                              <Checkbox
                                checked={selectedUsers.includes(userRow.id)}
                                onCheckedChange={() => toggleUserSelection(userRow.id)}
                                disabled={userRow.id === user?.id}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              <div className="truncate max-w-[120px]">{userRow.username || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="truncate max-w-[180px]">{userRow.email}</div>
                            </TableCell>
                            <TableCell className="text-sm">{userRow.credits}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${
                                userRow.status === 'premium' ? 'bg-purple-500' :
                                userRow.status === 'pro' ? 'bg-blue-500' :
                                userRow.status === 'trial' ? 'bg-green-500' :
                                'bg-gray-500'
                              }`}>
                                {userRow.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-muted text-xs">
                                No Plan
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs ${
                                  userRow.user_roles?.[0]?.role === 'owner' ? 'bg-red-500 hover:bg-red-600' :
                                  userRow.user_roles?.[0]?.role === 'admin' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                                  userRow.user_roles?.[0]?.role === 'moderator' ? 'bg-blue-500 hover:bg-blue-600' :
                                  'bg-gray-500 hover:bg-gray-600'
                                }`}>
                                  {userRow.user_roles?.[0]?.role || 'user'}
                                </Badge>
                                <Select
                                  value={userRow.user_roles?.[0]?.role || 'user'}
                                  onValueChange={(value) => handleRoleChange(userRow.id, value)}
                                >
                                  <SelectTrigger className="w-8 h-8 p-0 border-none bg-transparent hover:bg-muted">
                                    <SelectValue>
                                      <span className="text-xs">▼</span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="bg-card z-50">
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="owner">Owner</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={userRow.unlimited}
                                onCheckedChange={() => handleUpdateUser(userRow.id, { unlimited: !userRow.unlimited })}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(userRow.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: '2-digit' 
                              })}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Select
                                  value={userRow.status}
                                  onValueChange={(value) => handleUpdateUser(userRow.id, { status: value })}
                                >
                                  <SelectTrigger className="w-20 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="trial">Trial</SelectItem>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUserForCredits(userRow);
                                    setSetCreditsDialogOpen(true);
                                  }}
                                  className="h-8 px-2 text-xs"
                                >
                                  +
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            {/* Security Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">Total Attempts (24h)</p>
                  <p className="text-2xl font-bold">{totalAttempts}</p>
                </div>
              </Card>
              <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">Failed Attempts</p>
                  <p className="text-2xl font-bold text-destructive">{failedAttempts}</p>
                </div>
              </Card>
              <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">Blocked IPs</p>
                  <p className="text-2xl font-bold text-orange-500">0</p>
                </div>
              </Card>
            </div>

            {/* Recent Login Attempts */}
            <Card className="hover:shadow-md transition-shadow">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Recent Login Attempts</h2>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 pr-4">
                    {loginAttempts.map((attempt) => {
                      const metadata = attempt.metadata as any || {};
                      return (
                        <div
                          key={attempt.id}
                          className={`p-3 rounded-lg border ${
                            attempt.success 
                              ? 'border-green-500/30 bg-green-500/5' 
                              : 'border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={attempt.success ? 'default' : 'destructive'}
                                className={attempt.success ? 'bg-green-500' : 'bg-red-500'}
                              >
                                {attempt.success ? 'SUCCESS' : 'FAILED'}
                              </Badge>
                              <span className="font-semibold text-sm">{attempt.email || 'Unknown'}</span>
                            </div>
                            
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>IP: {attempt.ip_address || 'Unknown'}</p>
                              {metadata.country && metadata.country !== 'Unknown' && (
                                <p>Country: {metadata.country}{metadata.city && ` (${metadata.city})`}</p>
                              )}
                              <p className="break-all">UA: {attempt.user_agent || 'Unknown'}</p>
                              <p>{new Date(attempt.created_at).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {loginAttempts.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No login attempts recorded in the last 24 hours</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="keys" className="space-y-4">
            <Card className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-3">Key Management</h2>
                <p className="text-sm text-muted-foreground">Key management features coming soon...</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            <Card className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-3">Referral Tracking</h2>
                <p className="text-sm text-muted-foreground">Referral features coming soon...</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            {selectedUserProfile && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Username</p>
                    <p className="text-sm text-muted-foreground">{selectedUserProfile.username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{selectedUserProfile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Credits</p>
                    <p className="text-sm text-muted-foreground">{selectedUserProfile.credits}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">{selectedUserProfile.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUserProfile.user_roles?.[0]?.role || 'user'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedUserProfile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Set Credits Dialog */}
        <SetCreditsDialog
          open={setCreditsDialogOpen}
          onOpenChange={setSetCreditsDialogOpen}
          onConfirm={handleSetCredits}
          userName={selectedUserForCredits?.username || selectedUserForCredits?.email || 'User'}
          currentCredits={selectedUserForCredits?.credits || 0}
        />
      </div>
    </div>
  );
};

export default Admin;