import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Ticket, TicketStatus, TicketPriority, Message } from '../types/ticket';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

// 실시간 메시지 이벤트 페이로드 타입 (profiles join 없이 DB 컬럼만)
interface RealtimeMessagePayload {
    id: string;
    ticket_id: string;
    user_id: string;
    content: string;
    is_internal_note: boolean;
    is_resolution: boolean;
    image_url: string | null;
    created_at: string;
    thread_parent_id: string | null;
}

interface TicketStore {
    tickets: Ticket[];
    messages: Message[];
    activeTab: TicketStatus;
    selectedTicketId: string | null;
    isLoadingData: boolean;
    isSubscribed: boolean;
    unreadCounts: Record<string, number>;
    realtimeChannel: RealtimeChannel | null;

    fetchTickets: () => Promise<void>;
    fetchUnreadCounts: () => Promise<void>;
    markAsRead: (ticketId: string) => Promise<void>;
    createTicket: (title: string, description: string, priority: TicketPriority, userId: string, workspaceId: string, imageUrl?: string) => Promise<void>;
    updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
    deleteTicket: (id: string) => Promise<void>;
    updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
    requestResolution: (id: string) => Promise<void>;
    fetchMessages: (ticketId: string) => Promise<void>;
    sendMessage: (ticketId: string, content: string, userId: string, isInternal?: boolean, imageUrl?: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
    setActiveTab: (tab: TicketStatus) => void;
    setSelectedTicketId: (id: string | null) => void;
    subscribeToChanges: () => (() => void);
}

export const useTicketStore = create<TicketStore>((set, get) => ({
    tickets: [],
    messages: [],
    activeTab: 'in_progress',
    selectedTicketId: null,
    isLoadingData: false,
    isSubscribed: false,
    unreadCounts: {},
    realtimeChannel: null,

    fetchTickets: async () => {
        const { currentWorkspace } = useAuthStore.getState();
        if (!currentWorkspace) return;

        set({ isLoadingData: true });
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('workspace_id', currentWorkspace.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
        } else {
            set({ tickets: data as Ticket[] });
        }
        set({ isLoadingData: false });
        await get().fetchUnreadCounts();
    },

    fetchUnreadCounts: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const tickets = get().tickets;
        if (tickets.length === 0) {
            set({ unreadCounts: {} });
            return;
        }

        const ticketIds = tickets.map(t => t.id);

        // N+1 쿼리 해결: 티켓마다 개별 요청 대신 DB 함수 1번 호출로 전부 처리
        const { data, error } = await supabase
            .rpc('get_unread_counts', {
                p_user_id: user.id,
                p_ticket_ids: ticketIds,
            });

        if (error) {
            console.error('Error fetching unread counts:', error);
            return;
        }

        // 모든 티켓을 0으로 초기화한 뒤 실제 카운트 적용
        const counts: Record<string, number> = {};
        tickets.forEach(t => { counts[t.id] = 0; });
        (data as { ticket_id: string; unread_count: number }[] | null)?.forEach(row => {
            counts[row.ticket_id] = Number(row.unread_count);
        });

        set({ unreadCounts: counts });
    },

    markAsRead: async (ticketId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date().toISOString();

        // 낙관적 업데이트 (화면 먼저 0으로 변경)
        set((state) => ({
            unreadCounts: { ...state.unreadCounts, [ticketId]: 0 }
        }));

        const { error } = await supabase
            .from('profiles_tickets_reads')
            .upsert({
                profile_id: user.id,
                ticket_id: ticketId,
                last_read_at: now
            }, { onConflict: 'profile_id,ticket_id' });

        if (error) console.error('Error marking as read:', error);
    },

    createTicket: async (title, description, priority, userId, workspaceId, imageUrl) => {
        const { data, error } = await supabase
            .from('tickets')
            .insert([{ title, description, priority, requesting_user_id: userId, workspace_id: workspaceId, status: 'in_progress', image_url: imageUrl }])
            .select()
            .single();

        if (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }

        if (data) {
            set((state) => {
                if (state.tickets.some(t => t.id === (data as Ticket).id)) return state;
                return { tickets: [data as Ticket, ...state.tickets] };
            });
        }
    },

    updateTicketStatus: async (id, status) => {
        const prevTickets = get().tickets;
        const updates = status === 'in_progress' ? { status, resolve_requested: false } : { status };
        set((state) => ({
            tickets: state.tickets.map(t => t.id === id ? { ...t, ...updates } : t)
        }));

        const { error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            set({ tickets: prevTickets });
            throw error;
        }
    },

    deleteTicket: async (id) => {
        const prevTickets = get().tickets;
        set((state) => ({
            tickets: state.tickets.filter(t => t.id !== id),
            selectedTicketId: state.selectedTicketId === id ? null : state.selectedTicketId
        }));
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) {
            console.error('Error deleting ticket:', error);
            set({ tickets: prevTickets });
            throw error;
        }
    },

    updateTicket: async (id, updates) => {
        const prevTickets = get().tickets;
        set((state) => ({
            tickets: state.tickets.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
        const { error } = await supabase.from('tickets').update(updates).eq('id', id);
        if (error) {
            console.error('Error updating ticket:', error);
            set({ tickets: prevTickets });
            throw error;
        }
    },

    requestResolution: async (id) => {
        await get().updateTicket(id, { resolve_requested: true });
    },

    fetchMessages: async (ticketId) => {
        const { data, error } = await supabase
            .from('messages')
            .select(`*, profiles:user_id(full_name, email)`)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            set({ messages: data as Message[] });
        }
    },

    sendMessage: async (ticketId, content, userId, isInternal = false, imageUrl) => {
        const { data, error } = await supabase
            .from('messages')
            .insert([{ ticket_id: ticketId, user_id: userId, content, is_internal_note: isInternal, image_url: imageUrl }])
            .select(`*, profiles:user_id(full_name, email)`)
            .single();

        if (error) {
            console.error('Error sending message:', error);
            throw error;
        }

        if (data) {
            set((state) => {
                if (state.messages.find(m => m.id === (data as Message).id)) return state;
                return { messages: [...state.messages, data as Message] };
            });
            // Broadcast로 다른 클라이언트에 즉시 전달 (RLS JOIN 한계 우회)
            const { realtimeChannel } = get();
            if (realtimeChannel) {
                realtimeChannel.send({
                    type: 'broadcast',
                    event: 'new-message',
                    payload: data as Message,
                });
            }
        }
    },

    deleteMessage: async (messageId) => {
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;

        set((state) => ({
            messages: state.messages.filter(m => m.id !== messageId),
        }));
    },

    uploadImage: async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('attachments')
            .getPublicUrl(fileName);

        return data.publicUrl;
    },

    setActiveTab: (activeTab) => set({ activeTab, selectedTicketId: null, messages: [] }),

    setSelectedTicketId: (selectedTicketId) => {
        set({ selectedTicketId });
        if (selectedTicketId) {
            get().fetchMessages(selectedTicketId);
            get().markAsRead(selectedTicketId);
        }
    },

    subscribeToChanges: () => {
        if (get().isSubscribed) return () => {};

        const { currentWorkspace } = useAuthStore.getState();
        if (!currentWorkspace) return () => {};

        console.log(`🔔 [Realtime] Subscribing to Workspace: ${currentWorkspace.name}...`);

        // 초기 구독 시 fetchTickets는 TicketList useEffect가 담당 — 재연결 시에만 동기화
        let isFirstSubscribe = true;

        const channel = supabase
            .channel(`db-changes-${currentWorkspace.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tickets',
                filter: `workspace_id=eq.${currentWorkspace.id}`
            }, (payload) => {
                console.log('📝 [Realtime] Ticket Change:', payload);
                const { eventType, new: newTicket, old: oldTicket } = payload;

                if (eventType === 'INSERT') {
                    set((state) => {
                        if (state.tickets.some(t => t.id === (newTicket as Ticket).id)) return state;
                        return { tickets: [newTicket as Ticket, ...state.tickets] };
                    });
                } else if (eventType === 'UPDATE') {
                    set((state) => ({
                        tickets: state.tickets.map(t => t.id === (newTicket as Ticket).id ? { ...t, ...newTicket } : t)
                    }));
                } else if (eventType === 'DELETE') {
                    set((state) => ({
                        tickets: state.tickets.filter(t => t.id !== (oldTicket as Ticket).id),
                        selectedTicketId: state.selectedTicketId === (oldTicket as Ticket).id ? null : state.selectedTicketId
                    }));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                const newMessage = payload.new as RealtimeMessagePayload;
                const { data: { user } } = await supabase.auth.getUser();

                // 내 메시지가 아니고 알림 권한이 있을 때 브라우저 알림 발송
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && user && newMessage.user_id !== user.id) {
                    new Notification('CS Talk - 새 메시지', {
                        body: newMessage.content,
                        icon: '/icon-192.png',
                        tag: newMessage.ticket_id
                    });
                }

                if (newMessage.ticket_id === get().selectedTicketId) {
                    // 현재 보고 있는 채팅방 메시지 → payload로 즉시 추가 후 profiles로 업데이트
                    const baseMessage: Message = {
                        ...newMessage,
                        image_url: newMessage.image_url ?? undefined,
                        thread_parent_id: newMessage.thread_parent_id ?? undefined,
                        profiles: undefined,
                    };
                    set((state) => {
                        if (state.messages.some(m => m.id === newMessage.id)) return state;
                        return { messages: [...state.messages, baseMessage] };
                    });
                    get().markAsRead(newMessage.ticket_id);

                    // profiles 정보 비동기 업데이트 (실패해도 메시지는 이미 표시됨)
                    if (newMessage.user_id) {
                        const { data } = await supabase
                            .from('messages')
                            .select(`*, profiles:user_id(full_name, email)`)
                            .eq('id', newMessage.id)
                            .single();
                        if (data) {
                            set((state) => ({
                                messages: state.messages.map(m =>
                                    m.id === newMessage.id ? (data as Message) : m
                                )
                            }));
                        }
                    }
                } else {
                    // 다른 채팅방 메시지 → 안읽음 배지 증가
                    set((state) => ({
                        unreadCounts: {
                            ...state.unreadCounts,
                            [newMessage.ticket_id]: (state.unreadCounts[newMessage.ticket_id] || 0) + 1
                        }
                    }));
                }
            })
            .on('broadcast', { event: 'new-message' }, ({ payload }) => {
                // RLS JOIN 한계를 우회하는 Broadcast 수신 — postgres_changes가 전달 못한 메시지를 여기서 처리
                const newMessage = payload as Message;
                if (newMessage.ticket_id === get().selectedTicketId) {
                    set((state) => {
                        if (state.messages.some(m => m.id === newMessage.id)) return state;
                        return { messages: [...state.messages, newMessage] };
                    });
                    get().markAsRead(newMessage.ticket_id);
                } else {
                    set((state) => ({
                        unreadCounts: {
                            ...state.unreadCounts,
                            [newMessage.ticket_id]: (state.unreadCounts[newMessage.ticket_id] || 0) + 1
                        }
                    }));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles_tickets_reads' }, async (payload) => {
                const newRead = payload.new as { profile_id: string; ticket_id: string; last_read_at: string } | undefined;
                const { data: { user } } = await supabase.auth.getUser();
                if (newRead && user && newRead.profile_id === user.id) {
                    set((state) => ({
                        unreadCounts: { ...state.unreadCounts, [newRead.ticket_id]: 0 }
                    }));
                }
            })
            .subscribe((status) => {
                console.log('📡 [Realtime] Status:', status);
                if (status === 'SUBSCRIBED') {
                    set({ isSubscribed: true, realtimeChannel: channel });
                    if (isFirstSubscribe) {
                        // 초기 구독 — TicketList useEffect가 이미 fetchTickets 호출하므로 스킵
                        isFirstSubscribe = false;
                    } else {
                        // 재연결 — 끊긴 동안 놓친 데이터 동기화 (모바일 네트워크 전환 대비)
                        get().fetchTickets();
                        const selectedId = get().selectedTicketId;
                        if (selectedId) get().fetchMessages(selectedId);
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    // 채널 오류 시 isSubscribed 초기화 → App.tsx 워크스페이스 변경 없이는
                    // 자동 재구독이 안 되므로 채널을 직접 제거 후 재구독
                    set({ isSubscribed: false });
                    supabase.removeChannel(channel);
                    setTimeout(() => {
                        get().subscribeToChanges();
                    }, 2000);
                }
            });

        return () => {
            console.log('🔕 [Realtime] Unsubscribing...');
            supabase.removeChannel(channel);
            // CHANNEL_ERROR 재구독으로 교체된 채널도 정리 (채널 누수 방지)
            const currentChannel = get().realtimeChannel;
            if (currentChannel && currentChannel !== channel) {
                supabase.removeChannel(currentChannel);
            }
            set({ isSubscribed: false, realtimeChannel: null });
        };
    }
}));
