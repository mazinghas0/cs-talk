import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    created_at?: string;
}

interface AuthStore {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    isLoading: boolean;
    isAdmin: boolean;
    allProfiles: Profile[];

    initialize: () => void;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
    fetchProfile: (id: string) => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    fetchAllProfiles: () => Promise<void>;
    updateUserRole: (targetId: string, newRole: 'user' | 'admin') => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    allProfiles: [],
    get isAdmin() { return get().profile?.role === 'admin'; },

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({ session, user: session?.user || null });

            if (session?.user) {
                await get().fetchProfile(session.user.id);
            }

            set({ isLoading: false });

            supabase.auth.onAuthStateChange(async (_event, session) => {
                set({ session, user: session?.user || null });
                if (session?.user) {
                    await get().fetchProfile(session.user.id);
                } else {
                    set({ profile: null });
                }
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
        set({ user: null, session: null, profile: null });
    },

    fetchProfile: async (id) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (!error && data) {
            set({ profile: data as Profile });
        }
    },

    updateProfile: async (updates) => {
        const user = get().user;
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error('Update profile error:', error);
            throw error;
        }

        set((state) => ({
            profile: state.profile ? { ...state.profile, ...updates } : null
        }));
    },

    fetchAllProfiles: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            set({ allProfiles: data as Profile[] });
        }
    },

    updateUserRole: async (targetId, newRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', targetId);

        if (error) throw error;

        set((state) => ({
            allProfiles: state.allProfiles.map(p =>
                p.id === targetId ? { ...p, role: newRole } : p
            ),
            // 본인 role 변경 시 profile도 업데이트
            profile: state.profile?.id === targetId
                ? { ...state.profile, role: newRole }
                : state.profile,
        }));
    },
}));
