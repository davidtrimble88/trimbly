import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserTimezone } from "@/lib/timezone";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profileName: string | null;
  avatarUrl: string | null;
  userTimezone: string | null;
  vikingModeUnlocked: boolean;
  isPaidAccount: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState<string | null>(null);
  const [vikingModeUnlocked, setVikingModeUnlocked] = useState(false);
  const [isPaidAccount, setIsPaidAccount] = useState(false);

  const fetchProfileName = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("full_name, avatar_url, timezone, viking_mode_unlocked, user_type, subscription_tier").eq("id", userId).maybeSingle();
    setProfileName(data?.full_name || null);
    setAvatarUrl(data?.avatar_url || null);
    setUserTimezone(data?.timezone || null);
    setVikingModeUnlocked(data?.viking_mode_unlocked || false);
    // "Paid" means the account currently holds a non-free tier — including
    // during beta, where BETA_FREE_ACCESS lets someone pick a paid-named
    // tier for free (subscription_tier is still set to that real value).
    // That's deliberate: it's exactly the set of accounts that WILL be
    // charged once billing turns on, which is what should be able to show
    // off Viking Mode, not every free-tier signup that happened to use a
    // partner code. Providers/mechanics track their tier on the separate
    // `providers` table instead of `profiles`, so a second lookup is needed
    // for that account type.
    if (data?.user_type === "provider") {
      const { data: prov } = await supabase.from("providers").select("subscription_tier").eq("user_id", userId).maybeSingle();
      setIsPaidAccount((prov?.subscription_tier || "free") !== "free");
    } else {
      setIsPaidAccount((data?.subscription_tier || "free") !== "free");
    }
    // Self-heal: fill in the timezone for accounts created before we captured it,
    // or refresh it if the user has moved devices/regions.
    const browserTz = getBrowserTimezone();
    if (data && data.timezone !== browserTz) {
      supabase.from("profiles").update({ timezone: browserTz }).eq("id", userId).then(() => {});
      setUserTimezone(browserTz);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfileName(session.user.id);
      else { setProfileName(null); setAvatarUrl(null); setUserTimezone(null); setVikingModeUnlocked(false); setIsPaidAccount(false); }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfileName(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { ...metadata, timezone: getBrowserTimezone() },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileName(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profileName, avatarUrl, userTimezone, vikingModeUnlocked, isPaidAccount, refreshProfile, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
