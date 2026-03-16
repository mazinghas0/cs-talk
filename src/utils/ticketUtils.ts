import type { Message, MessageBookmark, MessageReaction, Ticket, TicketStatus } from '../types/ticket';

export interface UnreadCountRow {
    ticket_id: string;
    unread_count: number;
}

export function mapTicketIds(tickets: Ticket[]) {
    return tickets.map((t) => t.id);
}

export function buildUnreadCountMap(tickets: Ticket[], rows: UnreadCountRow[] | null | undefined) {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => { counts[t.id] = 0; });
    (rows ?? []).forEach((row) => {
        counts[row.ticket_id] = Number(row.unread_count);
    });
    return counts;
}

export function clearUnreadCount(unreadCounts: Record<string, number>, ticketId: string) {
    return { ...unreadCounts, [ticketId]: 0 };
}

export function incrementUnreadCount(unreadCounts: Record<string, number>, ticketId: string) {
    return { ...unreadCounts, [ticketId]: (unreadCounts[ticketId] ?? 0) + 1 };
}

export function getTicketStatusPatch(status: TicketStatus): Partial<Ticket> {
    return status === 'in_progress' ? { status, resolve_requested: false } : { status };
}

export function mergeTicketUpdates(tickets: Ticket[], ticketId: string, updates: Partial<Ticket>) {
    return tickets.map((t) => (t.id === ticketId ? { ...t, ...updates } : t));
}

export function prependUniqueTicket(tickets: Ticket[], next: Ticket) {
    if (tickets.some((t) => t.id === next.id)) return tickets;
    return [next, ...tickets];
}

export function upsertTicketById(tickets: Ticket[], next: Ticket) {
    if (!tickets.some((t) => t.id === next.id)) return [next, ...tickets];
    return tickets.map((t) => (t.id === next.id ? { ...t, ...next } : t));
}

export function removeTicketById(tickets: Ticket[], ticketId: string) {
    return tickets.filter((t) => t.id !== ticketId);
}

export function appendUniqueMessage(messages: Message[], next: Message) {
    if (messages.some((m) => m.id === next.id)) return messages;
    return [...messages, next];
}

export function replaceMessageById(messages: Message[], next: Message) {
    return messages.map((m) => (m.id === next.id ? next : m));
}

export function removeMessageById(messages: Message[], messageId: string) {
    return messages.filter((m) => m.id !== messageId);
}

export function groupReactionsByMessage(reactions: MessageReaction[]) {
    return reactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
        acc[r.message_id] = [...(acc[r.message_id] ?? []), r];
        return acc;
    }, {});
}

export function addReactionToMap(reactions: Record<string, MessageReaction[]>, reaction: MessageReaction) {
    const current = reactions[reaction.message_id] ?? [];
    if (current.some((r) => r.id === reaction.id)) return reactions;
    return { ...reactions, [reaction.message_id]: [...current, reaction] };
}

export function removeReactionFromMap(reactions: Record<string, MessageReaction[]>, messageId: string, reactionId: string) {
    return {
        ...reactions,
        [messageId]: (reactions[messageId] ?? []).filter((r) => r.id !== reactionId),
    };
}

export function sortBookmarksByNewest(bookmarks: MessageBookmark[]) {
    return [...bookmarks].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function prependBookmark(bookmarks: MessageBookmark[], bookmark: MessageBookmark) {
    if (bookmarks.some((b) => b.id === bookmark.id)) return bookmarks;
    return [bookmark, ...bookmarks];
}

export function removeBookmarkById(bookmarks: MessageBookmark[], bookmarkId: string) {
    return bookmarks.filter((b) => b.id !== bookmarkId);
}

export function removeBookmarksByTicketId(bookmarks: MessageBookmark[], ticketId: string) {
    return bookmarks.filter((b) => b.ticket_id !== ticketId);
}

export function findBookmarkByMessageId(bookmarks: MessageBookmark[], messageId: string) {
    return bookmarks.find((b) => b.message_id === messageId);
}
