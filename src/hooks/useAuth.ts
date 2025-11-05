import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh session on initialization with timeout
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error("Session refresh error:", error);
        } else if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    // Set loading timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth loading timeout reached");
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Initialize auth with refresh
    initializeAuth();

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
};