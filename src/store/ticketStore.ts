import { create } from 'zustand';
import { Ticket, TicketStatus, TicketPriority, Message } from '../types/ticket';
import { supabase } from '../lib/supabase';

interface TicketStore {
    // Data
    tickets: Ticket[];
    messages: Message[];

    // UI State
    activeTab: TicketStatus;
    selectedTicketId: string | null;
    isLoadingData: boolean;
    isSubscribed: boolean;

    // Actions
    fetchTickets: () => Promise<void>;
    createTicket: (title: string, description: string, priority: TicketPriority, userId: string, imageUrl?: string) => Promise<void>;
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

    fetchTickets: async () => {
        set({ isLoadingData: true });
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
        } else {
            set({ tickets: data as Ticket[] });
        }
        set({ isLoadingData: false });
    },

    createTicket: async (title, description, priority, userId, imageUrl) => {
        const { data, error } = await supabase
            .from('tickets')
            .insert([
                { title, description, priority, requesting_user_id: userId, status: 'in_progress', image_url: imageUrl }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }

        if (data) {
            set((state) => ({ tickets: [data as Ticket, ...state.tickets] }));
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
            .select(`*, profiles:user_id(full_name)`)
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
            .select(`*, profiles:user_id(full_name)`)
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
        }
    },

    subscribeToChanges: () => {
        if (get().isSubscribed) {
            return () => { };
        }

        console.log('🔔 [Realtime] Subscribing...');

        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
                console.log('📝 [Realtime] Ticket Change:', payload);
                const { eventType, new: newTicket, old: oldTicket } = payload;

                if (eventType === 'INSERT') {
                    set((state) => ({
                        tickets: [newTicket as Ticket, ...state.tickets]
                    }));
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
                console.log('💬 [Realtime] Message Insert:', payload);
                const newMessage = payload.new as any;

                if (newMessage.ticket_id === get().selectedTicketId) {
                    const { data, error } = await supabase
                        .from('messages')
                        .select(`*, profiles:user_id(full_name)`)
                        .eq('id', newMessage.id)
                        .single();

                    if (!error && data) {
                        set((state) => {
                            if (state.messages.some(m => m.id === data.id)) return state;
                            return { messages: [...state.messages, data] };
                        });
                    }
                }
            })
            .subscribe((status) => {
                console.log('📡 [Realtime] Status:', status);
                if (status === 'SUBSCRIBED') {
                    set({ isSubscribed: true });
                }
            });

        return () => {
            console.log('🔕 [Realtime] Unsubscribing...');
            supabase.removeChannel(channel);
            set({ isSubscribed: false });
        };
    }
}));
