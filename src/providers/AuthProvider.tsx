import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { queryKeys } from '@/hooks/query-keys';
import { supabase } from '@/lib/supabase';
import type { CoupleMember, Profile } from '@/types/models';

type AuthState = {
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  membership: CoupleMember | null;
  /** Vrai tant que la session ou le profil ne sont pas connus. */
  loading: boolean;
  refreshMe: () => Promise<unknown>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchMe(userId: string) {
  const [profile, membership] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('couple_members').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  if (membership.error) throw membership.error;
  return { profile: profile.data, membership: membership.data };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  const me = useQuery({
    queryKey: queryKeys.me(userId),
    queryFn: () => fetchMe(userId!),
    enabled: userId !== null,
  });

  const value = useMemo<AuthState>(
    () => ({
      session,
      userId,
      profile: me.data?.profile ?? null,
      membership: me.data?.membership ?? null,
      loading: !sessionLoaded || (userId !== null && me.isPending),
      refreshMe: () => me.refetch(),
    }),
    [session, userId, me, sessionLoaded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return context;
}

/** Pour les écrans du duo : l'utilisateur est forcément connecté et membre d'un couple. */
export function useMembership() {
  const { userId, membership, profile } = useAuth();
  if (!userId || !membership) throw new Error('Aucun duo actif');
  return { userId, coupleId: membership.couple_id, role: membership.role, profile };
}
