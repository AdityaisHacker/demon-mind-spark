import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Infinity,
  Download,
  Trash2,
  CreditCard,
  UserCog,
  ShieldBan,
  Users,
  Activity,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { KeyGenerator } from "@/components/KeyGenerator";
import { SubscriptionKeyGenerator } from "@/components/SubscriptionKeyGenerator";
import { KeyManagement } from "@/components/KeyManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminReferralTracking } from "@/components/AdminReferralTracking";
import { ReferralSettingsManager } from "@/components/ReferralSettingsManager";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { SubscriptionManagerDialog } from "@/components/admin/SubscriptionManagerDialog";
import { RoleManagerDialog } from "@/components/admin/RoleManagerDialog";
import { SuspendAccountDialog } from "@/components/admin/SuspendAccountDialog";
import { ActivateAccountDialog } from "@/components/admin/ActivateAccountDialog";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  credits: number;
  status: string;
  created_at: string;
  has_unlimited_credits: boolean;
  subscription_expires_at?: string | null;
  avatar_url?: string | null;
  is_suspended?: boolean;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  last_login?: string | null;
  referred_by?: string | null;
  referral_code?: string | null;
  role?: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface UserRole {
  role: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  performed_by: string;
}

interface LoginAttempt {
  id: string;
  ip_address: string;
  user_agent: string;
  email: string | null;
  success: boolean;
  created_at: string;
  blocked_until: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCredits: 0,
    activeUsers: 0,
  });
  const [customCredits, setCustomCredits] = useState<{ [key: string]: string }>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<CreditTransaction[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userActivityLog, setUserActivityLog] = useState<ActivityLog[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [securityStats, setSecurityStats] = useState({
    totalAttempts: 0,
    failedAttempts: 0,
    blockedIPs: 0,
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"delete" | "credits" | "status" | "ban" | null>(null);
  const [bulkCreditsValue, setBulkCreditsValue] = useState("");
  const [bulkStatusValue, setBulkStatusValue] = useState<string>("free");

  useEffect(() => {
    // Wait for auth and admin checks to complete
    if (authLoading || adminLoading) {
      return;
    }

    // Redirect if not authenticated
    if (!user) {
      navigate("/auth");
      return;
    }

    // Redirect if not admin
    if (!isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    // If we reach here, user is authenticated and is admin
    if (isAdmin) {
      fetchUsers();
      fetchStats();
      fetchLoginAttempts();

      // Subscribe to real-time updates - combine into single channel
      const adminChannel = supabase
        .channel("admin-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            fetchUsers();
            fetchStats();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "credit_transactions",
          },
          () => {
            fetchUsers();
            fetchStats();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(adminChannel);
      };
    }
  }, [isAdmin, authLoading, adminLoading, user, navigate]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter((user) => user.username.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)),
      );
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    // Fetch profiles and roles separately (no FK between them)
    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesResult.error || !profilesResult.data) {
      console.error("Error fetching users:", profilesResult.error);
      return;
    }

    // Merge roles with profiles efficiently using a Map
    const rolesMap = new Map(rolesResult.data?.map((r) => [r.user_id, r.role]) || []);

    const usersWithRoles = profilesResult.data.map((profile) => ({
      ...profile,
      role: rolesMap.get(profile.id) || "user",
    }));

    setUsers(usersWithRoles);
  };

  const fetchStats = async () => {
    const { data: allProfiles } = await supabase.from("profiles").select("*");

    if (allProfiles) {
      setStats({
        totalUsers: allProfiles.length,
        totalCredits: allProfiles.reduce((sum, profile) => sum + profile.credits, 0),
        activeUsers: allProfiles.filter((p) => p.status !== "Free").length,
      });
    }
  };

  const fetchUserTransactions = async (userId: string) => {
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setUserTransactions(data);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    if (data) {
      setUserRoles(data);
    } else {
      setUserRoles([]);
    }
  };

  const fetchActivityLog = async (userId: string) => {
    const { data } = await supabase
      .from("user_activity_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setUserActivityLog(data);
    } else {
      setUserActivityLog([]);
    }
  };

  const fetchLoginAttempts = async () => {
    const { data, error } = await supabase
      .from("login_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLoginAttempts(data);

      // Calculate security stats
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentAttempts = data.filter((attempt) => new Date(attempt.created_at) > last24Hours);

      const blocked = data.filter((attempt) => attempt.blocked_until && new Date(attempt.blocked_until) > now);

      setSecurityStats({
        totalAttempts: recentAttempts.length,
        failedAttempts: recentAttempts.filter((a) => !a.success).length,
        blockedIPs: new Set(blocked.map((a) => a.ip_address)).size,
      });
    }
  };

  const openUserDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    await Promise.all([fetchUserTransactions(user.id), fetchUserRoles(user.id), fetchActivityLog(user.id)]);
    setDetailsDialogOpen(true);
  };

  const handleManageSubscription = () => {
    setDetailsDialogOpen(false);
    setSubscriptionDialogOpen(true);
  };

  const handleManageRole = () => {
    setDetailsDialogOpen(false);
    setRoleDialogOpen(true);
  };

  const handleSuspendAccount = () => {
    setDetailsDialogOpen(false);
    setSuspendDialogOpen(true);
  };

  const handleActivateAccount = () => {
    setDetailsDialogOpen(false);
    setActivateDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !user) return;

    // Get current admin info
    const { data: adminProfile } = await supabase.from("profiles").select("email, username").eq("id", user.id).single();

    const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error("Failed to send password reset email");
      return;
    }

    // Log the admin action
    try {
      await supabase.rpc("log_admin_action", {
        _user_id: selectedUser.id,
        _action_type: "password_reset_admin",
        _description: `Admin ${adminProfile?.email || "unknown"} initiated password reset for ${selectedUser.email}`,
        _metadata: {
          admin_username: adminProfile?.username,
          target_email: selectedUser.email,
          target_username: selectedUser.username,
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    toast.success("Password reset email sent and action logged");
  };

  const handleDialogSuccess = () => {
    fetchUsers();
    if (selectedUser) {
      openUserDetails(selectedUser);
    }
  };

  const updateCredits = async (userId: string, amount: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newCredits = user.credits + amount;

    // Optimistic update
    setUsers(users.map((u) => (u.id === userId ? { ...u, credits: newCredits } : u)));

    const { error } = await supabase.from("profiles").update({ credits: newCredits }).eq("id", userId);

    if (error) {
      toast.error("Failed to update credits");
      fetchUsers(); // Revert on error
      return;
    }

    // Log transaction
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: amount,
      transaction_type: amount > 0 ? "admin_credit" : "admin_debit",
      description: `Admin ${amount > 0 ? "added" : "removed"} ${Math.abs(amount)} credits`,
    });

    toast.success(`Credits updated successfully`);
    setCustomCredits({ ...customCredits, [userId]: "" });
  };

  const handleCustomCredits = (userId: string) => {
    const amount = parseInt(customCredits[userId] || "0");
    if (isNaN(amount) || amount === 0) {
      toast.error("Please enter a valid number");
      return;
    }
    updateCredits(userId, amount);
  };

  const toggleUnlimitedCredits = async (userId: string, currentValue: boolean) => {
    const { error } = await supabase.from("profiles").update({ has_unlimited_credits: !currentValue }).eq("id", userId);

    if (error) {
      toast.error("Failed to update unlimited credits");
      return;
    }

    toast.success(`Unlimited credits ${!currentValue ? "enabled" : "disabled"} for user`);
    fetchUsers();
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    // If changing to free or trial, remove subscription and unlimited credits
    const updateData: any = { status: newStatus };

    if (newStatus === "free" || newStatus === "trial") {
      updateData.has_unlimited_credits = false;
      updateData.subscription_expires_at = null;
    }

    const { error } = await supabase.from("profiles").update(updateData).eq("id", userId);

    if (error) {
      toast.error("Failed to update user status");
      return;
    }

    toast.success(
      `User status updated to ${newStatus}${newStatus === "free" || newStatus === "trial" ? " (subscription removed)" : ""}`,
    );
    fetchUsers();
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ["Username", "Email", "Credits", "Status", "Unlimited Credits", "Join Date"],
      ...users.map((u) => [
        u.username,
        u.email,
        u.credits,
        u.status,
        u.has_unlimited_credits ? "Yes" : "No",
        new Date(u.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Users exported successfully");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const handleBulkAction = (action: "delete" | "credits" | "status" | "ban") => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;

    try {
      switch (bulkAction) {
        case "delete": {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            toast.error("Not authenticated");
            return;
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

          for (const userId of selectedUsers) {
            await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ userId }),
            });
          }

          toast.success(`Successfully deleted ${selectedUsers.length} users`);
          break;
        }

        case "credits": {
          const amount = parseInt(bulkCreditsValue);
          if (isNaN(amount)) {
            toast.error("Please enter a valid number");
            return;
          }

          for (const userId of selectedUsers) {
            const user = users.find((u) => u.id === userId);
            if (!user) continue;

            await supabase
              .from("profiles")
              .update({ credits: user.credits + amount })
              .eq("id", userId);

            await supabase.from("credit_transactions").insert({
              user_id: userId,
              amount: amount,
              transaction_type: amount > 0 ? "admin_credit" : "admin_debit",
              description: `Bulk ${amount > 0 ? "added" : "removed"} ${Math.abs(amount)} credits`,
            });
          }

          toast.success(`Updated credits for ${selectedUsers.length} users`);
          break;
        }

        case "status": {
          for (const userId of selectedUsers) {
            // If changing to free or trial, remove subscription and unlimited credits
            const updateData: any = { status: bulkStatusValue };

            if (bulkStatusValue === "free" || bulkStatusValue === "trial") {
              updateData.has_unlimited_credits = false;
              updateData.subscription_expires_at = null;
            }

            await supabase.from("profiles").update(updateData).eq("id", userId);
          }

          toast.success(
            `Updated status for ${selectedUsers.length} users to ${bulkStatusValue}${bulkStatusValue === "free" || bulkStatusValue === "trial" ? " (subscriptions removed)" : ""}`,
          );
          break;
        }

        case "ban": {
          for (const userId of selectedUsers) {
            // Ban user by deleting from auth.users (cascades to profiles)
            const { error } = await supabase.auth.admin.deleteUser(userId);
            if (error) throw error;
          }

          toast.success(`Banned ${selectedUsers.length} user(s) successfully`);
          break;
        }
      }

      fetchUsers();
      fetchStats();
      setSelectedUsers([]);
      setBulkActionDialogOpen(false);
      setBulkAction(null);
      setBulkCreditsValue("");
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Failed to execute bulk action");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "premium":
        return "bg-purple-500";
      case "pro":
        return "bg-blue-500";
      case "trial":
        return "bg-green-500";
      case "free":
        return "bg-gray-500";
      case "expired":
        return "bg-orange-500";
      case "banned":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDaysLeft = (expiryDate: string | null | undefined): number | null => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getSubscriptionDisplay = (userRow: UserProfile) => {
    const { subscription_expires_at, status, has_unlimited_credits } = userRow;

    if (!subscription_expires_at) {
      return (
        <Badge variant="outline" className="bg-muted">
          No Plan
        </Badge>
      );
    }

    const daysLeft = getDaysLeft(subscription_expires_at);

    if (daysLeft === null || daysLeft < 0) {
      return (
        <Badge variant="destructive" className="bg-red-500">
          Expired
        </Badge>
      );
    }

    const planType = status === "premium" ? "Premium" : status === "pro" ? "Pro" : "Active";
    let badgeClass = "bg-green-500";

    if (daysLeft <= 3) {
      badgeClass = "bg-red-500";
    } else if (daysLeft <= 7) {
      badgeClass = "bg-orange-500";
    }

    return (
      <div className="flex flex-col gap-1">
        <Badge className={badgeClass}>{planType}</Badge>
        <span className="text-xs text-muted-foreground">
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </span>
        <span className="text-xs text-muted-foreground">{new Date(subscription_expires_at).toLocaleDateString()}</span>
      </div>
    );
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background">
      <div className="w-full max-w-none space-y-4">
        {/* Header - Sticky with gradient */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Admin Panel
              </h1>
            </div>
            <Button onClick={exportUsers} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="security">Security Monitoring</TabsTrigger>
            <TabsTrigger value="keys">Key Management</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Stats Cards - Compact & Modern */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-violet-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                      <Users className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Users</p>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Total Credits</p>
                      <p className="text-2xl font-bold">{stats.totalCredits}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                      <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Active Users</p>
                      <p className="text-2xl font-bold">{stats.activeUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table - Compact & Modern */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Users ({filteredUsers.length})</CardTitle>
                    {selectedUsers.length > 0 && (
                      <Badge variant="secondary" className="text-sm px-2 py-1">
                        {selectedUsers.length} selected
                      </Badge>
                    )}
                  </div>

                  {/* Inline Search Bar */}
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction("credits")}
                        className="h-8 text-xs"
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        Credits
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction("status")}
                        className="h-8 text-xs"
                      >
                        <UserCog className="w-3 h-3 mr-1" />
                        Status
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBulkAction("ban")}
                        className="h-8 text-xs"
                      >
                        <ShieldBan className="w-3 h-3 mr-1" />
                        Ban
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBulkAction("delete")}
                        className="h-8 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <div className="min-w-[800px]">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-muted/50">
                      <TableRow className="hover:bg-muted/50">
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="w-36">Username</TableHead>
                        <TableHead className="w-48">Email</TableHead>
                        <TableHead className="w-24">Credits</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                        <TableHead className="w-28">Subscription</TableHead>
                        <TableHead className="w-20">Role</TableHead>
                        <TableHead className="w-20">∞</TableHead>
                        <TableHead className="w-28">Joined</TableHead>
                        <TableHead className="w-44">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((userRow) => (
                        <TableRow key={userRow.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                          <TableCell onClick={(e) => e.stopPropagation()} className="pl-4">
                            <Checkbox
                              checked={selectedUsers.includes(userRow.id)}
                              onCheckedChange={() => toggleUserSelection(userRow.id)}
                              disabled={userRow.id === user?.id}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm" onClick={() => openUserDetails(userRow)}>
                            <div className="truncate max-w-[120px]">{userRow.username}</div>
                          </TableCell>
                          <TableCell className="text-sm" onClick={() => openUserDetails(userRow)}>
                            <div className="truncate max-w-[160px]">{userRow.email}</div>
                          </TableCell>
                          <TableCell className="text-sm" onClick={() => openUserDetails(userRow)}>
                            {userRow.has_unlimited_credits ? <Infinity className="w-4 h-4" /> : userRow.credits}
                          </TableCell>
                          <TableCell onClick={() => openUserDetails(userRow)}>
                            <Badge className={`${getStatusColor(userRow.status)} text-xs`}>{userRow.status}</Badge>
                          </TableCell>
                          <TableCell onClick={() => openUserDetails(userRow)}>
                            {getSubscriptionDisplay(userRow)}
                          </TableCell>
                          <TableCell onClick={() => openUserDetails(userRow)}>
                            <Badge className={`${userRow.role === "admin" ? "bg-purple-500" : "bg-blue-500"} text-xs`}>
                              {userRow.role || "user"}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={userRow.has_unlimited_credits}
                              onCheckedChange={() => toggleUnlimitedCredits(userRow.id, userRow.has_unlimited_credits)}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground" onClick={() => openUserDetails(userRow)}>
                            {new Date(userRow.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "2-digit",
                            })}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap items-center gap-1">
                              {userRow.role !== "admin" && (
                                <Select
                                  value={userRow.status}
                                  onValueChange={(value) => updateUserStatus(userRow.id, value)}
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
                              )}
                              <Input
                                type="number"
                                placeholder="±"
                                value={customCredits[userRow.id] || ""}
                                onChange={(e) =>
                                  setCustomCredits({
                                    ...customCredits,
                                    [userRow.id]: e.target.value,
                                  })
                                }
                                className="w-16 h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleCustomCredits(userRow.id)}
                                className="h-8 px-2 text-xs"
                              >
                                +
                              </Button>
                              {userRow.id !== user?.id && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setSelectedUsers([userRow.id]);
                                      handleBulkAction("ban");
                                    }}
                                  >
                                    <ShieldBan className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setUserToDelete(userRow);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            {/* Security Stats - Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">Total Attempts (24h)</p>
                  <p className="text-2xl font-bold">{securityStats.totalAttempts}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">Failed Attempts</p>
                  <p className="text-2xl font-bold text-destructive">{securityStats.failedAttempts}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">Blocked IPs</p>
                  <p className="text-2xl font-bold text-orange-500">{securityStats.blockedIPs}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Login Attempts - Compact */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Login Attempts</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-y-auto space-y-2" style={{ maxHeight: "calc(100vh - 400px)" }}>
                  {loginAttempts.map((attempt) => {
                    const isBlocked = attempt.blocked_until && new Date(attempt.blocked_until) > new Date();

                    return (
                      <div
                        key={attempt.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all hover:scale-[1.01] ${
                          isBlocked
                            ? "border-orange-500/50 bg-orange-500/5"
                            : attempt.success
                              ? "border-green-500/50 bg-green-500/5"
                              : "border-destructive/50 bg-destructive/5"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={isBlocked ? "outline" : attempt.success ? "default" : "destructive"}
                              className={isBlocked ? "border-orange-500 text-orange-500" : ""}
                            >
                              {isBlocked ? "BLOCKED" : attempt.success ? "SUCCESS" : "FAILED"}
                            </Badge>
                            {attempt.email && <span className="text-sm font-medium">{attempt.email}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">IP: {attempt.ip_address}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-md">UA: {attempt.user_agent}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attempt.created_at).toLocaleString()}
                          </p>
                          {isBlocked && (
                            <p className="text-xs text-orange-600 font-medium mt-1">
                              Blocked until: {new Date(attempt.blocked_until!).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {loginAttempts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No login attempts recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys" className="space-y-4">
            {/* Key Generators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubscriptionKeyGenerator />
              <KeyGenerator />
            </div>

            {/* Key Management Table */}
            <KeyManagement />
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            <AdminReferralTracking />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user "{userToDelete?.username}" and all their data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Dialog */}
      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "delete" && "Delete Multiple Users"}
              {bulkAction === "credits" && "Add Credits to Multiple Users"}
              {bulkAction === "status" && "Change Status for Multiple Users"}
              {bulkAction === "ban" && "Ban Multiple Users"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete" && (
                <>
                  This will permanently delete {selectedUsers.length} users and all their data. This action cannot be
                  undone.
                </>
              )}
              {bulkAction === "ban" && (
                <div className="space-y-2">
                  <p className="text-destructive font-semibold">
                    ⚠️ This will permanently BAN {selectedUsers.length} user(s):
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>User account will be completely deleted</li>
                    <li>All user data will be removed</li>
                    <li>User cannot create new account</li>
                    <li>This action CANNOT be undone</li>
                  </ul>
                </div>
              )}
              {bulkAction === "credits" && (
                <div className="space-y-4 mt-4">
                  <p>Enter the amount of credits to add or remove for {selectedUsers.length} users:</p>
                  <Input
                    type="number"
                    placeholder="Enter amount (use negative for removal)"
                    value={bulkCreditsValue}
                    onChange={(e) => setBulkCreditsValue(e.target.value)}
                  />
                </div>
              )}
              {bulkAction === "status" && (
                <div className="space-y-4 mt-4">
                  <p>Select the new status for {selectedUsers.length} users:</p>
                  <p className="text-xs text-muted-foreground">
                    Note: Changing to Free/Trial will remove subscriptions and unlimited credits
                  </p>
                  <Select value={bulkStatusValue} onValueChange={setBulkStatusValue}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setBulkAction(null);
                setBulkCreditsValue("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              className={
                bulkAction === "delete" || bulkAction === "ban"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {bulkAction === "delete" && "Delete All"}
              {bulkAction === "ban" && "Ban Users"}
              {bulkAction === "credits" && "Apply"}
              {bulkAction === "status" && "Apply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        user={selectedUser}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        transactions={userTransactions}
        roles={userRoles}
        activityLog={userActivityLog}
        onManageSubscription={handleManageSubscription}
        onManageRole={handleManageRole}
        onSuspendAccount={handleSuspendAccount}
        onActivateAccount={handleActivateAccount}
        onResetPassword={handleResetPassword}
        onAddCredits={() => {
          setDetailsDialogOpen(false);
          // Focus on credits input in main table
        }}
      />

      {/* Subscription Manager Dialog */}
      {selectedUser && (
        <SubscriptionManagerDialog
          userId={selectedUser.id}
          username={selectedUser.username}
          currentStatus={selectedUser.status}
          currentExpiry={selectedUser.subscription_expires_at || null}
          hasUnlimitedCredits={selectedUser.has_unlimited_credits}
          open={subscriptionDialogOpen}
          onOpenChange={setSubscriptionDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Role Manager Dialog */}
      {selectedUser && (
        <RoleManagerDialog
          userId={selectedUser.id}
          username={selectedUser.username}
          currentRoles={userRoles.map((r) => r.role)}
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Suspend Account Dialog */}
      {selectedUser && (
        <SuspendAccountDialog
          userId={selectedUser.id}
          username={selectedUser.username}
          open={suspendDialogOpen}
          onOpenChange={setSuspendDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Activate Account Dialog */}
      {selectedUser && (
        <ActivateAccountDialog
          userId={selectedUser.id}
          username={selectedUser.username}
          open={activateDialogOpen}
          onOpenChange={setActivateDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}
