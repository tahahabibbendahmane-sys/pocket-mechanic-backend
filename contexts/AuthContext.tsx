import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  displayName: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Supabase
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, first_name, last_name, display_name')
        .eq('id', userId)
        .single();

      if (error) {
        // JWT expired - refresh session once and retry
        if (error.code === 'PGRST303') {
          const {
            data: { session },
          } = await supabase.auth.refreshSession();
          if (session) {
            return fetchProfile(userId);
          }
          return;
        }

        // Profile might not exist yet, create it
        if (error.code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userData.user.email || '',
                name: null,
              })
              .select()
              .single();

            if (!createError && newProfile) {
              const email = newProfile.email || '';
              const displayName =
                (newProfile as any).display_name ||
                (newProfile as any).first_name ||
                (email ? email.split('@')[0] : '') ||
                '';
              setProfile({
                id: newProfile.id,
                name: newProfile.name,
                email,
                displayName: displayName.trim() || '',
              });
            }
          }
        } else {
          console.error('Error fetching profile:', error);
        }
        return;
      }

      if (data) {
        const d = data as any;
        const email = d.email || '';
        const displayName =
          (d.display_name || d.first_name || (email ? email.split('@')[0] : '') || '').trim() || '';
        setProfile({
          id: data.id,
          name: data.name,
          email,
          displayName,
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  // Initialize auth state on app startup
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const expiresAt = session.expires_at ?? 0;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt - now < 60) {
          const { data } = await supabase.auth.refreshSession();
          if (data.session) {
            session = data.session;
          }
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
      } else if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { error: authError };
      }

      // Create/update profile after signup
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            name: name,
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error creating/updating profile:', profileError);
        }

        await fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        refreshProfile,
        signIn,
        signUp,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
