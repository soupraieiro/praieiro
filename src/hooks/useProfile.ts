import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

// Use the actual database type for profiles
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Profile interface for frontend use (extends database type)
export interface Profile extends ProfileRow {}

// Retry delays for exponential backoff (ms)
const RETRY_DELAYS = [300, 800, 1500, 3000, 5000];

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Fetch profile with exponential backoff retry
  const fetchProfileWithRetry = useCallback(async (userId: string): Promise<Profile | null> => {
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (!isMountedRef.current) return null;

      try {
        // CORRECT: profiles.id = auth.users.id (identidade soberana)
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error(`Profile fetch attempt ${attempt + 1} failed:`, fetchError.message);
          throw fetchError;
        }

        if (data) {
          return data as Profile;
        }

        // Profile doesn't exist yet - retry with backoff if attempts remain
        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          console.log(`Profile not found, retrying in ${delay}ms (attempt ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (err) {
        // On error, still retry if attempts remain
        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return null;
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsRetrying(true);
    retryCountRef.current = 0;

    try {
      const profileData = await fetchProfileWithRetry(user.id);
      
      if (isMountedRef.current) {
        if (profileData) {
          setProfile(profileData);
          setError(null);
        } else {
          // Profile still doesn't exist after all retries
          // This is expected for eventual consistency - don't treat as error
          setProfile(null);
          console.log("Profile not yet available - backend trigger may still be processing");
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : "Erro ao carregar perfil";
        setError(message);
        console.error("Profile fetch error:", message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRetrying(false);
      }
    }
  }, [user, fetchProfileWithRetry]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [user, fetchProfile]);

  // ⚠️ REMOVED: createProfile function
  // Profile creation is EXCLUSIVELY handled by backend trigger on auth.users insert
  // Front-end should NEVER insert into profiles table

  // Update profile (only allowed for existing profiles)
  // Uses Partial of the Update type from database
  type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
  
  const updateProfile = useCallback(async (data: Omit<ProfileUpdate, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!profile) throw new Error("Perfil não encontrado - aguarde a criação pelo sistema");

    // CORRECT: profiles.id = auth.users.id (identidade soberana)
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    setProfile(updatedProfile as Profile);
    return updatedProfile;
  }, [user, profile]);

  // Refresh profile data
  const refreshProfile = useCallback(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  return {
    profile,
    loading,
    error,
    isRetrying,
    fetchProfile,
    updateProfile,
    refreshProfile,
    hasProfile: !!profile,
    // ⚠️ createProfile removed - profiles are created by backend trigger only
  };
}
