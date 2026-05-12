import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, boolean>();

export function useFeatureFlag(key: string, defaultValue = false): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => cache.get(key) ?? defaultValue);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", key)
        .maybeSingle();
      if (cancelled) return;
      const val = data?.enabled ?? defaultValue;
      cache.set(key, val);
      setEnabled(val);
    })();
    return () => { cancelled = true; };
  }, [key, defaultValue]);

  return enabled;
}
