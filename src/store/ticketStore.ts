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

    // Actions
    fetchTickets: () => Promise<void>;
    createTicket: (title: string, description: string, priority: TicketPriority, userId: string) => Promise<void>;
    updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;

    // Message Actions
    fetchMessages: (ticketId: string) => Promise<void>;
    sendMessage: (ticketId: string, content: string, userId: string, isInternal?: boolean) => Promise<void>;

    setActiveTab: (tab: TicketStatus) => void;
    setSelectedTicketId: (id: string | null) => void;
}


export const useTicketStore = create<TicketStore>((set, get) => ({
    tickets: [],
    messages: [],
    activeTab: 'open',
    selectedTicketId: null,
    isLoadingData: false,

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

    createTicket: async (title, description, priority, userId) => {
        const { data, error } = await supabase
            .from('tickets')
            .insert([
                { title, description, priority, requesting_user_id: userId }
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
        set((state) => ({
            tickets: state.tickets.map(t => t.id === id ? { ...t, status } : t)
        }));

        const { error } = await supabase
            .from('tickets')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            // Rollback
            set({ tickets: prevTickets });
            throw error;
        }
    },

    fetchMessages: async (ticketId) => {
        const { data, error } = await supabase
            .from('messages')
            .select(`*, profiles:sender_id(full_name)`)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
        } else {
            set({ messages: data as any[] });
        }
    },

    sendMessage: async (ticketId, content, userId, isInternal = false) => {
        const { data, error } = await supabase
            .from('messages')
            .insert([
                { ticket_id: ticketId, sender_id: userId, content, is_internal: isInternal }
            ])
            .select(`*, profiles:sender_id(full_name)`)
            .single();

        if (error) {
            console.error('Error sending message:', error);
            throw error;
        }

        if (data) {
            set((state) => ({ messages: [...state.messages, data as any] }));
        }
    },

    setActiveTab: (activeTab) => set({ activeTab, selectedTicketId: null, messages: [] }),
    setSelectedTicketId: (selectedTicketId) => {
        set({ selectedTicketId });
        if (selectedTicketId) {
            get().fetchMessages(selectedTicketId);
        }
    },
}));
