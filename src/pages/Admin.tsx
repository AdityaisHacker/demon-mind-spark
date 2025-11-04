import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Download, Search, MoreVertical, User } from "lucide-react";
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
import { CreditDialog } from "@/components/CreditDialog";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUserForCredits, setSelectedUserForCredits] = useState<Profile | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<Profile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roles) {
        toast.error("Access denied. Admin only.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadAdminData();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

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

      // Load deleted users
      const { data: deletedData, error: deletedError } = await supabase
        .from("deleted_users")
        .select("*")
        .order("deleted_at", { ascending: false });

      if (deletedError) {
        console.error("Error loading deleted users:", deletedError);
      } else if (deletedData) {
        setDeletedUsers(deletedData);
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

  const handleAddCredits = async (credits: number) => {
    if (!selectedUserForCredits) return;
    
    await handleUpdateUser(selectedUserForCredits.id, { 
      credits: (selectedUserForCredits.credits || 0) + credits 
    });
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
  const activeUsers = users.filter(u => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(u.created_at).getTime() > weekAgo;
  }).length;
  const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-demon">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="ghost" size="icon" className="hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <Button onClick={exportUsers} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Users
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6 bg-card/50">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="deleted">Deleted Users</TabsTrigger>
            <TabsTrigger value="keys">Key Management</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-card/80 border-border/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Users</h3>
                <p className="text-4xl font-bold">{users.length}</p>
              </Card>
              <Card className="p-6 bg-card/80 border-border/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Credits</h3>
                <p className="text-4xl font-bold">{totalCredits}</p>
              </Card>
              <Card className="p-6 bg-card/80 border-border/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Users</h3>
                <p className="text-4xl font-bold">{activeUsers}</p>
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50 border-border/50"
              />
            </div>

            {/* Users Table */}
            <Card className="bg-card/80 border-border/50">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">User Management ({filteredUsers.length})</h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead>Avatar</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Unlimited</TableHead>
                        <TableHead>Banned</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow 
                          key={user.id} 
                          className="border-border/50 cursor-pointer hover:bg-muted/50"
                          onClick={(e) => {
                            // Don't open dialog if clicking on interactive elements
                            if ((e.target as HTMLElement).closest('button, select, input, [role="switch"]')) {
                              return;
                            }
                            setSelectedUserProfile(user);
                            setProfileDialogOpen(true);
                          }}
                        >
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || ""} alt={user.username || "User"} />
                              <AvatarFallback>
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{user.username || "-"}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.credits || 0}</TableCell>
                          <TableCell>
                            <Badge variant={user.status === "free" ? "secondary" : "default"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.user_roles?.[0]?.role || "user"}
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.unlimited}
                              onCheckedChange={(checked) => 
                                handleUpdateUser(user.id, { unlimited: checked })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.banned ? "destructive" : "secondary"}>
                              {user.banned ? "Banned" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUserForCredits(user);
                                  setCreditDialogOpen(true);
                                }}
                                className="text-xs"
                              >
                                +Credits
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleUpdateUser(user.id, { 
                                  status: user.status === "free" ? "premium" : "free" 
                                })}
                              >
                                Apply
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleBanUser(user.id, user.banned)}
                                    className={user.banned ? "text-green-600" : "text-yellow-600"}
                                  >
                                    {user.banned ? "Unban User" : "Ban User"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-destructive"
                                  >
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="deleted" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-card/80 border-border/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Deleted Users</h3>
                <p className="text-4xl font-bold">{deletedUsers.length}</p>
              </Card>
              <Card className="p-6 bg-card/80 border-border/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Can Recreate Accounts</h3>
                <p className="text-4xl font-bold text-green-500">{deletedUsers.length}</p>
              </Card>
            </div>

            {/* Deleted Users Table */}
            <Card className="bg-card/80 border-border/50">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Deleted Users ({deletedUsers.length})</h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead>Email</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Deleted By</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedUsers.map((user) => (
                        <TableRow key={user.id} className="border-border/50">
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.username || "-"}</TableCell>
                          <TableCell>{user.deleted_by}</TableCell>
                          <TableCell>
                            <Badge variant={user.deleted_by_role === "admin" ? "destructive" : "secondary"}>
                              {user.deleted_by_role}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.deleted_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreUser(user.email)}
                              className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                            >
                              Allow Recreate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {deletedUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No deleted users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 p-4 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Deleted users can automatically recreate their accounts by signing up again with the same email. 
                    Click "Allow Recreate" to immediately enable account recreation for a specific user.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="keys">
            <Card className="p-6 bg-card/80 border-border/50">
              <h2 className="text-xl font-bold mb-4">API Key Management</h2>
              <p className="text-muted-foreground">Coming soon...</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreditDialog
        open={creditDialogOpen}
        onOpenChange={setCreditDialogOpen}
        onConfirm={handleAddCredits}
        userName={selectedUserForCredits?.username || selectedUserForCredits?.email || "User"}
      />

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile Details</DialogTitle>
          </DialogHeader>
          {selectedUserProfile && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedUserProfile.avatar_url || ""} alt={selectedUserProfile.username || "User"} />
                  <AvatarFallback className="text-2xl">
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{selectedUserProfile.username || "No username"}</h3>
                  <p className="text-muted-foreground">{selectedUserProfile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">User ID</p>
                  <p className="font-mono text-xs break-all">{selectedUserProfile.id}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Join Date</p>
                  <p className="font-medium">{new Date(selectedUserProfile.created_at).toLocaleDateString()}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Credits</p>
                  <p className="text-2xl font-bold">{selectedUserProfile.credits || 0}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedUserProfile.status === "free" ? "secondary" : "default"}>
                    {selectedUserProfile.status}
                  </Badge>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Role</p>
                  <Badge>{selectedUserProfile.user_roles?.[0]?.role || "user"}</Badge>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                  <Badge variant={selectedUserProfile.banned ? "destructive" : "default"}>
                    {selectedUserProfile.banned ? "Banned" : "Active"}
                  </Badge>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Unlimited Credits</p>
                  <Badge variant={selectedUserProfile.unlimited ? "default" : "secondary"}>
                    {selectedUserProfile.unlimited ? "Yes" : "No"}
                  </Badge>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;