import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getGuestIdentity, regenerateIdentity as regenerateFromAPI, type PirateIdentity } from '@/lib/pirateIdentity';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PirateIdentityContextType {
  identity: PirateIdentity | null;
  isLoading: boolean;
  isRegenerating: boolean;
  regenerateIdentity: () => Promise<void>;
  refreshFromDb: () => Promise<void>;
}

const PirateIdentityContext = createContext<PirateIdentityContextType | undefined>(undefined);

export function PirateIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<PirateIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { user } = useAuth();

  // Load identity: from DB if authenticated, else from localStorage/API
  useEffect(() => {
    const loadIdentity = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // Load from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('pirate_name, pirate_role, pirate_bounty, pirate_image_path, custom_avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!error && data) {
            setIdentity({
              id: 0,
              name: data.pirate_name || 'Guest Pirate',
              role: data.pirate_role || 'Pirate',
              bounty: data.pirate_bounty || '0',
              imagePath: data.custom_avatar_url || data.pirate_image_path || '',
              fetchedAt: new Date().toISOString(),
            });
          } else {
            // Fallback to local identity
            const pirateIdentity = await getGuestIdentity();
            setIdentity(pirateIdentity);
          }
        } else {
          const pirateIdentity = await getGuestIdentity();
          setIdentity(pirateIdentity);
        }
      } catch (error) {
        console.error('Failed to load pirate identity:', error);
        // Final fallback
        try {
          const pirateIdentity = await getGuestIdentity();
          setIdentity(pirateIdentity);
        } catch {}
      } finally {
        setIsLoading(false);
      }
    };
    loadIdentity();
  }, [user]);

  const refreshFromDb = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('pirate_name, pirate_role, pirate_bounty, pirate_image_path, custom_avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setIdentity({
        id: 0,
        name: data.pirate_name || 'Guest Pirate',
        role: data.pirate_role || 'Pirate',
        bounty: data.pirate_bounty || '0',
        imagePath: data.custom_avatar_url || data.pirate_image_path || '',
        fetchedAt: new Date().toISOString(),
      });
    }
  }, [user]);

  const regenerateIdentity = useCallback(async () => {
    setIsRegenerating(true);
    try {
      const newIdentity = await regenerateFromAPI();
      setIdentity(newIdentity);
      // If authenticated, also save to DB
      if (user) {
        await supabase.from('profiles').update({
          pirate_name: newIdentity.name,
          pirate_role: newIdentity.role,
          pirate_bounty: newIdentity.bounty,
          pirate_image_path: newIdentity.imagePath,
        }).eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Failed to regenerate identity:', error);
      throw error;
    } finally {
      setIsRegenerating(false);
    }
  }, [user]);

  return (
    <PirateIdentityContext.Provider value={{ identity, isLoading, isRegenerating, regenerateIdentity, refreshFromDb }}>
      {children}
    </PirateIdentityContext.Provider>
  );
}

export function usePirateIdentity() {
  const context = useContext(PirateIdentityContext);
  if (context === undefined) {
    throw new Error('usePirateIdentity must be used within a PirateIdentityProvider');
  }
  return context;
}
