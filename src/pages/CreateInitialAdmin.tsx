import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CreateInitialAdmin = () => {
  const [loading, setLoading] = useState(false);

  const createAdmin = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('create-admin', {
        body: {
          email: 'opadityaytpie1@gmail.com',
          password: 'Admin@123456' // You should change this after first login
        }
      });

      if (response.error) {
        throw response.error;
      }

      toast.success("Admin account created successfully! Email: opadityaytpie1@gmail.com, Password: Admin@123456");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-2xl text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Create Initial Admin</h1>
          <p className="text-muted-foreground mb-6">
            This will create an admin account with email: opadityaytpie1@gmail.com
          </p>
          <Button
            onClick={createAdmin}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Admin Account"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateInitialAdmin;
