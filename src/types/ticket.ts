export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    image_url?: string;
    created_at: string;
    updated_at: string;
    assignee_id?: string;
    requesting_user_id: string;
    resolve_requested: boolean;
}

export interface Message {
    id: string;
    ticket_id: string;
    sender_id: string;
    content: string;
    is_internal: boolean;
    is_resolution: boolean;
    image_url?: string;
    created_at: string;
    thread_parent_id?: string;
    profiles?: {
        full_name: string;
    };
}
