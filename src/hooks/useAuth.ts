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
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log successful login attempts with IP and User Agent
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Get geolocation data from ipapi.co
            const geoResponse = await fetch('https://ipapi.co/json/');
            const geoData = await geoResponse.json();
            
            await supabase.from('login_attempts').insert({
              email: session.user.email,
              ip_address: geoData.ip || 'Unknown',
              user_agent: navigator.userAgent,
              success: true,
              metadata: {
                country: geoData.country_name || 'Unknown',
                city: geoData.city || 'Unknown',
                provider: session.user.app_metadata?.provider || 'email'
              }
            });
          } catch (error) {
            console.error('Failed to log login attempt:', error);
          }
        }
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