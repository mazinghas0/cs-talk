export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
    id: string;
    workspace_id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    image_url?: string;
    image_urls?: string[];
    pin?: string; // 고객 접근용 핀 추가
    created_at: string;
    updated_at: string;
    assignee_id?: string;
    requesting_user_id: string;
    resolve_requested: boolean;
    tags: string[];
}

export interface Workspace {
    id: string;
    name: string;
    owner_id: string;
    plan_type: 'free' | 'pro';
    invite_code?: string;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceMember {
    workspace_id: string;
    user_id: string;
    role: 'leader' | 'member';
    joined_at: string;
}

export interface MessageReaction {
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
}

export interface MessageBookmark {
    id: string;
    message_id: string;
    user_id: string;
    content_snapshot: string;
    ticket_id: string;
    created_at: string;
}

export interface Message {
    id: string;
    ticket_id: string;
    user_id: string | null;
    content: string;
    is_internal_note: boolean;
    is_resolution: boolean;
    image_url?: string;
    customer_name?: string;
    created_at: string;
    thread_parent_id?: string;
    profiles?: {
        full_name: string | null;
        email?: string;
    };
}
