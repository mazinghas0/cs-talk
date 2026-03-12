import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { Workspace } from '../types/ticket';

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
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;

    initialize: () => void;
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    signOut: () => Promise<void>;
    fetchProfile: (id: string) => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    fetchAllProfiles: () => Promise<void>;
    updateUserRole: (targetId: string, newRole: 'user' | 'admin') => Promise<void>;
    fetchWorkspaces: () => Promise<void>;
    setCurrentWorkspace: (workspace: Workspace | null) => void;
    createWorkspace: (name: string) => Promise<void>;
    generateInviteCode: (workspaceId: string) => Promise<string>;
    joinWorkspaceByCode: (code: string) => Promise<Workspace>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    // isAdmin을 명시적 state 필드로 관리
    // (Zustand getter 패턴은 set() 호출 시 값이 굳어버리는 버그가 있음)
    isAdmin: false,
    allProfiles: [],
    workspaces: [],
    currentWorkspace: null,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            set({ session, user: session?.user || null });

            if (session?.user) {
                await get().fetchProfile(session.user.id);
                await get().fetchWorkspaces();
            }

            set({ isLoading: false });

            supabase.auth.onAuthStateChange(async (_event, session) => {
                set({ session, user: session?.user || null, isLoading: true });
                if (session?.user) {
                    await get().fetchProfile(session.user.id);
                    await get().fetchWorkspaces();
                } else {
                    set({ profile: null, isAdmin: false, workspaces: [], currentWorkspace: null });
                }
                set({ isLoading: false });
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
        set({ user: null, session: null, profile: null, isAdmin: false, workspaces: [], currentWorkspace: null, allProfiles: [] });
    },

    fetchProfile: async (id) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (!error && data) {
            set({
                profile: data as Profile,
                isAdmin: data.role === 'admin',
            });
            return;
        }

        // 신규 유저: DB 트리거가 아직 profiles 행을 생성하지 않은 경우 직접 생성
        if (error?.code === 'PGRST116') {
            const user = get().user;
            const { data: upserted } = await supabase
                .from('profiles')
                .upsert({
                    id,
                    email: user?.email ?? '',
                    full_name: null,
                    avatar_url: null,
                    role: 'user',
                }, { onConflict: 'id' })
                .select()
                .single();

            if (upserted) {
                set({ profile: upserted as Profile, isAdmin: false });
            }
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
            profile: state.profile ? { ...state.profile, ...updates } : null,
            isAdmin: updates.role !== undefined ? updates.role === 'admin' : state.isAdmin,
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
            profile: state.profile?.id === targetId
                ? { ...state.profile, role: newRole }
                : state.profile,
            // 본인 role이 바뀐 경우 isAdmin도 즉시 반영
            isAdmin: state.profile?.id === targetId ? newRole === 'admin' : state.isAdmin,
        }));
    },

    fetchWorkspaces: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 멤버로 속한 워크스페이스 ID 조회
        // (DB 트리거로 owner도 자동으로 workspace_members에 등록됨)
        const { data: memberData } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', user.id);

        const workspaceIds = memberData?.map(m => m.workspace_id) || [];

        if (workspaceIds.length === 0) {
            set({ workspaces: [] });
            return;
        }

        // 문자열 조합 방식 제거 → 안전한 .in() 방식 사용
        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds)
            .order('created_at', { ascending: false });

        if (!error && data) {
            set({ workspaces: data as Workspace[] });
            if (data.length > 0 && !get().currentWorkspace) {
                set({ currentWorkspace: data[0] as Workspace });
            }
        }
    },

    setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

    generateInviteCode: async (workspaceId) => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

        const { error } = await supabase
            .from('workspaces')
            .update({ invite_code: code })
            .eq('id', workspaceId);

        if (error) throw error;

        set((state) => ({
            workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, invite_code: code } : w),
            currentWorkspace: state.currentWorkspace?.id === workspaceId
                ? { ...state.currentWorkspace, invite_code: code }
                : state.currentWorkspace,
        }));

        return code;
    },

    joinWorkspaceByCode: async (code) => {
        const user = get().user;
        if (!user) throw new Error('로그인이 필요합니다.');

        const { data: ws, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('invite_code', code.toUpperCase())
            .single();

        if (wsError || !ws) throw new Error('유효하지 않은 초대 코드입니다.');

        const alreadyMember = get().workspaces.some(w => w.id === ws.id);
        if (alreadyMember) {
            set({ currentWorkspace: ws as Workspace });
            return ws as Workspace;
        }

        const { error: joinError } = await supabase
            .from('workspace_members')
            .insert([{ workspace_id: ws.id, user_id: user.id, role: 'member' }]);

        if (joinError) throw joinError;

        set((state) => ({
            workspaces: [ws as Workspace, ...state.workspaces],
            currentWorkspace: ws as Workspace,
        }));

        return ws as Workspace;
    },

    createWorkspace: async (name) => {
        const user = get().user;
        if (!user) return;

        const { data, error } = await supabase
            .from('workspaces')
            .insert([{ name, owner_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Create workspace error:', error);
            throw error;
        }

        // DB 트리거(on_workspace_created)가 workspace_members에 자동으로 owner를 등록함
        // fetchWorkspaces로 최신 목록을 다시 불러옴
        await get().fetchWorkspaces();
        // 새로 만든 워크스페이스를 현재 공간으로 설정
        set({ currentWorkspace: data as Workspace });
    },
}));
