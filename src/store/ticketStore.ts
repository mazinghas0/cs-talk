import { create } from 'zustand';
import { Ticket, TicketStatus } from '../types/ticket';

interface TicketStore {
    // Data
    tickets: Ticket[];

    // UI State
    activeTab: TicketStatus;
    selectedTicketId: string | null;

    // Actions
    setTickets: (tickets: Ticket[]) => void;
    addTicket: (ticket: Ticket) => void;
    updateTicketStatus: (id: string, status: TicketStatus) => void;
    setActiveTab: (tab: TicketStatus) => void;
    setSelectedTicketId: (id: string | null) => void;
}

const mockTickets: Ticket[] = [
    {
        id: 't1', title: '로그인 오류 문의', description: '비밀번호를 맞게 입력해도 자꾸 틀리다고 나옵니다. 확인 부탁드립니다.',
        status: 'open', priority: 'high', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), updated_at: new Date().toISOString(), requesting_user_id: 'u1'
    },
    {
        id: 't2', title: '결제 시스템 장애', description: '결제창에서 이니시스 모듈이 호출되지 않습니다.',
        status: 'in_progress', priority: 'urgent', created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), updated_at: new Date().toISOString(), requesting_user_id: 'u2', assignee_id: 'admin1'
    },
    {
        id: 't3', title: '계정 탈퇴 요청', description: '서비스를 더 이상 이용하지 않아 탈퇴하고 싶습니다.',
        status: 'resolved', priority: 'low', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), updated_at: new Date().toISOString(), requesting_user_id: 'u3', assignee_id: 'admin2'
    }
];

export const useTicketStore = create<TicketStore>((set) => ({
    tickets: mockTickets,
    activeTab: 'open',
    selectedTicketId: null,

    setTickets: (tickets) => set({ tickets }),
    addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),
    updateTicketStatus: (id, status) => set((state) => ({
        tickets: state.tickets.map(t => t.id === id ? { ...t, status } : t)
    })),
    setActiveTab: (activeTab) => set({ activeTab }),
    setSelectedTicketId: (selectedTicketId) => set({ selectedTicketId }),
}));
