import { create } from 'zustand';
import { Ticket, TicketStatus, TicketPriority, Message } from '../types/ticket';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface TicketStore {
    // Data
    tickets: Ticket[];
    messages: Message[];

    // UI State
    activeTab: TicketStatus;
    selectedTicketId: string | null;
    isLoadingData: boolean;
    isSubscribed: boolean;
    unreadCounts: Record<string, number>;

    // Actions
    fetchTickets: () => Promise<void>;
    fetchUnreadCounts: () => Promise<void>;
    markAsRead: (ticketId: string) => Promise<void>;
    createTicket: (title: string, description: string, priority: TicketPriority, userId: string, workspaceId: string, imageUrl?: string) => Promise<void>;
    updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
    deleteTicket: (id: string) => Promise<void>;
    updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
    requestResolution: (id: string) => Promise<void>;

    // Message Actions
    fetchMessages: (ticketId: string) => Promise<void>;
    sendMessage: (ticketId: string, content: string, userId: string, isInternal?: boolean, imageUrl?: string) => Promise<void>;
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

        // 1. Get last read times
        const { data: readData } = await supabase
            .from('profiles_tickets_reads')
            .select('ticket_id, last_read_at')
            .eq('profile_id', user.id);

        const readMap: Record<string, string> = {};
        readData?.forEach(r => readMap[r.ticket_id] = r.last_read_at);

        // 2. Count messages after last read for each ticket
        const counts: Record<string, number> = {};
        const tickets = get().tickets;

        for (const ticket of tickets) {
            const lastRead = readMap[ticket.id] || '1970-01-01T00:00:00Z';
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('ticket_id', ticket.id)
                .gt('created_at', lastRead)
                .neq('user_id', user.id); // Don't count my own messages as unread

            if (!error) {
                counts[ticket.id] = count || 0;
            }
        }

        set({ unreadCounts: counts });
    },

    markAsRead: async (ticketId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date().toISOString();

        // Optimistic update
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
            .insert([
                { title, description, priority, requesting_user_id: userId, workspace_id: workspaceId, status: 'in_progress', image_url: imageUrl }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }

        if (data) {
            set((state) => {
                const isDuplicate = state.tickets.some(t => t.id === data.id);
                if (isDuplicate) return state;
                return { tickets: [data as Ticket, ...state.tickets] };
            });
        }
    },

    updateTicketStatus: async (id, status) => {
        // Optimistic update
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
            // Rollback
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
            set({ messages: data as any[] });
        }
    },

    sendMessage: async (ticketId, content, userId, isInternal = false, imageUrl) => {
        const { data, error } = await supabase
            .from('messages')
            .insert([
                { ticket_id: ticketId, user_id: userId, content, is_internal_note: isInternal, image_url: imageUrl }
            ])
            .select(`*, profiles:user_id(full_name, email)`)
            .single();

        if (error) {
            console.error('Error sending message:', error);
            throw error;
        }

        if (data) {
            set((state) => {
                // Prevent duplicate if already added by real-time
                if (state.messages.find(m => m.id === data.id)) return state;
                return { messages: [...state.messages, data as any] };
            });
        }
    },

    uploadImage: async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

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
        if (get().isSubscribed) return () => { };

        const { currentWorkspace } = useAuthStore.getState();
        if (!currentWorkspace) return () => { };

        console.log(`🔔 [Realtime] Subscribing to Workspace: ${currentWorkspace.name}...`);

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
                        if (state.tickets.some(t => t.id === newTicket.id)) return state;
                        return { tickets: [newTicket as Ticket, ...state.tickets] };
                    });
                } else if (eventType === 'UPDATE') {
                    set((state) => ({
                        tickets: state.tickets.map(t => t.id === newTicket.id ? { ...t, ...newTicket } : t)
                    }));
                } else if (eventType === 'DELETE') {
                    set((state) => ({
                        tickets: state.tickets.filter(t => t.id !== oldTicket.id),
                        selectedTicketId: state.selectedTicketId === oldTicket.id ? null : state.selectedTicketId
                    }));
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                const newMessage = payload.new as any;
                const { data: { user } } = await supabase.auth.getUser();

                // Show notification if:
                // 1. Permission granted
                // 2. Not my own message
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && user && newMessage.user_id !== user.id) {
                    new Notification('CS Talk - 새 메시지', {
                        body: newMessage.content,
                        icon: '/icon-192.png',
                        tag: newMessage.ticket_id // Group notifications by ticket
                    });
                }

                if (newMessage.ticket_id === get().selectedTicketId) {
                    const { data, error } = await supabase
                        .from('messages')
                        .select(`*, profiles:user_id(full_name, email)`)
                        .eq('id', newMessage.id)
                        .single();

                    if (!error && data) {
                        set((state) => {
                            if (state.messages.some(m => m.id === data.id)) return state;
                            return { messages: [...state.messages, data] };
                        });
                        // Viewing this ticket, so mark as read
                        get().markAsRead(newMessage.ticket_id);
                    }
                } else {
                    // Not viewing, so increment unread count
                    set((state) => ({
                        unreadCounts: {
                            ...state.unreadCounts,
                            [newMessage.ticket_id]: (state.unreadCounts[newMessage.ticket_id] || 0) + 1
                        }
                    }));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles_tickets_reads' }, async (payload) => {
                const { new: newRead } = payload as any;
                const { data: { user } } = await supabase.auth.getUser();
                if (newRead && user && newRead.profile_id === user.id) {
                    set((state) => ({
                        unreadCounts: { ...state.unreadCounts, [newRead.ticket_id]: 0 }
                    }));
                }
            })
            .subscribe((status) => {
                console.log('📡 [Realtime] Status:', status);
                if (status === 'SUBSCRIBED') set({ isSubscribed: true });
            });

        return () => {
            console.log('🔕 [Realtime] Unsubscribing...');
            supabase.removeChannel(channel);
            set({ isSubscribed: false });
        };
    }
}));
