import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Background frozen check
  useEffect(() => {
    if (!user) return;

    const checkFrozen = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("frozen")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.frozen) {
        await supabase.auth.signOut();
        toast.error("Sua conta está congelada. Entre em contato com o administrador.");
      }
    };

    checkFrozen();
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
