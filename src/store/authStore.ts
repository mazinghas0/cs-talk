import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthStore {
    user: User | null;
    session: Session | null;
    isLoading: boolean;

    initialize: () => void;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    session: null,
    isLoading: true,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({ session, user: session?.user || null, isLoading: false });

            supabase.auth.onAuthStateChange((_event, session) => {
                set({ session, user: session?.user || null });
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false });
        }
    },

    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
    }
}));
