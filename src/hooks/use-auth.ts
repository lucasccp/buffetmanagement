import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Check if user is frozen
          const { data: profile } = await supabase
            .from("profiles")
            .select("frozen")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.frozen) {
            await supabase.auth.signOut();
            toast.error("Sua conta está congelada. Entre em contato com o administrador.");
            setUser(null);
            setLoading(false);
            return;
          }
        }
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("frozen")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.frozen) {
          await supabase.auth.signOut();
          toast.error("Sua conta está congelada. Entre em contato com o administrador.");
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
