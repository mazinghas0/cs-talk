export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
    assignee_id?: string;
    requesting_user_id: string;
}

export interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    content: string;
    is_internal: boolean;
    is_resolution: boolean;
    created_at: string;
    thread_parent_id?: string;
    profiles?: {
        full_name: string;
    };
}
