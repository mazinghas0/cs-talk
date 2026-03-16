import React, { useEffect, useRef, useState } from 'react';
import { Clock, MoreVertical, Pencil, Trash2, RotateCcw, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Ticket } from '../../types/ticket';
import { WorkspaceMemberProfile } from '../../store/authStore';
import './TicketList.css';

export interface TicketItemProps {
    ticket: Ticket;
    isSelected: boolean;
    unreadCount: number;
    canSwipe: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canRestore: boolean;
    workspaceMembers: WorkspaceMemberProfile[];
    onSelect: (id: string) => void;
    onEdit: (ticket: Ticket) => void;
    onDelete: (ticketId: string) => void;
    onRestore: (ticketId: string) => void;
    onResolve: (ticketId: string) => Promise<void>;
}

export const TicketItem: React.FC<TicketItemProps> = React.memo(({
    ticket, isSelected, unreadCount, canSwipe, canEdit, canDelete, canRestore,
    workspaceMembers, onSelect, onEdit, onDelete, onRestore, onResolve,
}) => {
    const [swipeX, setSwipeX] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startY = useRef(0);
    const isSwiping = useRef(false);
    const isVerticalScroll = useRef(false);
    const SWIPE_THRESHOLD = 100;

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
                setConfirmDelete(false);
            }
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [menuOpen]);

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!canSwipe) return;
        const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
        const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
        startX.current = pageX;
        startY.current = pageY;
        isSwiping.current = true;
        isVerticalScroll.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isSwiping.current || isVerticalScroll.current) return;
        const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
        const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
        const deltaX = pageX - startX.current;
        const deltaY = pageY - startY.current;
        if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX)) {
            isVerticalScroll.current = true;
            setSwipeX(0);
            return;
        }
        if (deltaX > 0) {
            if ('touches' in e) e.preventDefault();
            setSwipeX(Math.min(deltaX, 150));
        } else {
            setSwipeX(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isSwiping.current) return;
        isSwiping.current = false;
        if (swipeX >= SWIPE_THRESHOLD) {
            try {
                await onResolve(ticket.id);
            } catch (err) {
                console.error('Swipe complete failed:', err);
            }
        }
        setSwipeX(0);
    };

    const assignee = ticket.assignee_id
        ? workspaceMembers.find((m) => m.user_id === ticket.assignee_id)
        : null;

    return (
        <div className="ticket-item-wrapper">
            <div className={`swipe-bg ${swipeX > 20 ? 'visible' : ''}`}>
                <div className="swipe-content" style={{ opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1) }}>
                    <Check size={20} />
                    <span>완료 처리</span>
                </div>
            </div>
            <div
                className={`ticket-item ${isSelected ? 'selected' : ''}`}
                style={{ transform: `translateX(${swipeX}px)`, zIndex: 1 }}
                onClick={() => onSelect(ticket.id)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                <div className="ticket-header">
                    <span className={`priority-badge ${ticket.priority}`}>{ticket.priority.toUpperCase()}</span>
                    <span className="time">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ko })}
                    </span>
                    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                    {(canEdit || canDelete || canRestore) && (
                        <div className="ticket-menu-wrap" ref={menuRef}>
                            <button
                                className="ticket-menu-btn"
                                title="더보기"
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); setConfirmDelete(false); }}
                            >
                                <MoreVertical size={14} />
                            </button>
                            {menuOpen && (
                                <div className="ticket-dropdown">
                                    {confirmDelete ? (
                                        <div className="ticket-dropdown-confirm">
                                            <span>정말 삭제할까요?</span>
                                            <div className="ticket-dropdown-confirm-btns">
                                                <button className="ticket-dropdown-del-confirm" onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); setMenuOpen(false); }}>삭제</button>
                                                <button className="ticket-dropdown-cancel" onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}>취소</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {canEdit && <button className="ticket-dropdown-item" onClick={(e) => { e.stopPropagation(); onEdit(ticket); setMenuOpen(false); }}><Pencil size={13} /> 수정</button>}
                                            {canRestore && <button className="ticket-dropdown-item" onClick={(e) => { e.stopPropagation(); onRestore(ticket.id); setMenuOpen(false); }}><RotateCcw size={13} /> 진행중으로 되돌리기</button>}
                                            {canDelete && <button className="ticket-dropdown-item danger" onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}><Trash2 size={13} /> 삭제</button>}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <h3 className="ticket-title">{ticket.title}</h3>
                {ticket.tags && ticket.tags.length > 0 && (
                    <div className="ticket-tags">
                        {ticket.tags.map(tag => <span key={tag} className="ticket-tag">{tag}</span>)}
                    </div>
                )}
                <p className="ticket-desc">{ticket.description}</p>
                {assignee && (
                    <div className="ticket-assignee">
                        <span className="assignee-dot" />
                        {assignee.full_name ?? assignee.email}
                    </div>
                )}
            </div>
        </div>
    );
});
