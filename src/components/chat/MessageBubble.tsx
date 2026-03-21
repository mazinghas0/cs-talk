import React, { useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Message, MessageReaction } from '../../types/ticket';

interface ReplyPreview {
    msgId: string;
    content: string;
    sender: string;
}

interface MessageBubbleProps {
    msg: Message;
    isMe: boolean;
    isInternalMsg: boolean;
    isContinued: boolean;
    isLastInGroup: boolean;
    senderName: string;
    avatarUrl?: string | null;
    replyPreview?: ReplyPreview | null;
    reactions?: MessageReaction[];
    currentUserId?: string | null;
    onToggleReaction?: (messageId: string, emoji: string) => void;
    onMenuOpen: (pos: { x: number; y: number }, msg: Message) => void;
    onScrollToReply?: (msgId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
    msg, isMe, isInternalMsg, isContinued, isLastInGroup, senderName, avatarUrl,
    replyPreview, reactions, currentUserId, onToggleReaction, onMenuOpen, onScrollToReply,
}) => {
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchMoved = useRef(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const msgDate = new Date(msg.created_at);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        onMenuOpen({ x: e.clientX, y: e.clientY }, msg);
    }, [msg, onMenuOpen]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        touchMoved.current = false;
        longPressTimer.current = setTimeout(() => {
            if (!touchMoved.current) {
                onMenuOpen({ x: touch.clientX, y: touch.clientY }, msg);
            }
        }, 500);
    }, [msg, onMenuOpen]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStartPos.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 8 || dy > 8) {
            touchMoved.current = true;
            if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        touchStartPos.current = null;
    }, []);

    // 이모지별 카운트 및 내가 누른 여부 집계
    const reactionGroups = React.useMemo(() => {
        if (!reactions || reactions.length === 0) return [];
        const map = new Map<string, { count: number; isMine: boolean }>();
        for (const r of reactions) {
            const existing = map.get(r.emoji);
            if (existing) {
                existing.count += 1;
                if (r.user_id === currentUserId) existing.isMine = true;
            } else {
                map.set(r.emoji, { count: 1, isMine: r.user_id === currentUserId });
            }
        }
        return Array.from(map.entries()).map(([emoji, { count, isMine }]) => ({ emoji, count, isMine }));
    }, [reactions, currentUserId]);

    const reactionBadges = reactionGroups.length > 0 ? (
        <div className={`reaction-row${isMe ? ' reaction-row-me' : ''}`}>
            {reactionGroups.map(({ emoji, count, isMine }) => (
                <button
                    key={emoji}
                    className={`reaction-badge${isMine ? ' mine' : ''}`}
                    onClick={() => onToggleReaction?.(msg.id, emoji)}
                >
                    {emoji} {count}
                </button>
            ))}
        </div>
    ) : null;

    const bubbleEvents = {
        onContextMenu: handleContextMenu,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };

    if (isInternalMsg) {
        return (
            <div className="message-wrapper internal">
                <div className="message-bubble internal-bubble" data-msg-id={msg.id} {...bubbleEvents}>
                    {replyPreview && (
                        <div className="reply-quote" onClick={() => onScrollToReply?.(replyPreview.msgId)}>
                            <span className="reply-quote-sender">{replyPreview.sender}</span>
                            <p className="reply-quote-text">{replyPreview.content.slice(0, 60)}{replyPreview.content.length > 60 ? '...' : ''}</p>
                        </div>
                    )}
                    <p className="msg-text">{msg.content}</p>
                    {msg.image_url && (
                        <img src={msg.image_url} alt="첨부 이미지" className="attached-image" loading="lazy" />
                    )}
                    <span className="msg-time">{senderName} · {format(msgDate, 'a h:mm', { locale: ko })}</span>
                </div>
                {reactionBadges}
            </div>
        );
    }

    // 상대방 메시지(왼쪽) 아바타: 그룹 첫 메시지에만 표시, 이후 연속 메시지는 공백으로 자리 유지
    const avatarSlot = !isMe && !isInternalMsg ? (
        <div className={`msg-avatar-slot${isContinued ? ' avatar-hidden' : ''}`}>
            {!isContinued && (
                avatarUrl
                    ? <img src={avatarUrl} alt={senderName} className="msg-avatar-img" />
                    : <div className="msg-avatar-initial">{senderName.substring(0, 1).toUpperCase()}</div>
            )}
        </div>
    ) : null;

    return (
        <div className={`message-wrapper ${isMe ? 'admin-res' : 'user-req'} ${isContinued ? 'continued' : ''}`}>
            {avatarSlot}
            <div
                className={`message-bubble ${isMe ? 'res-bubble' : 'req-bubble'} ${isContinued ? 'bubble-continued' : ''}`}
                data-msg-id={msg.id}
                {...bubbleEvents}
            >
                {replyPreview && (
                    <div className="reply-quote" onClick={() => onScrollToReply?.(replyPreview.msgId)}>
                        <span className="reply-quote-sender">{replyPreview.sender}</span>
                        <p className="reply-quote-text">{replyPreview.content.slice(0, 60)}{replyPreview.content.length > 60 ? '...' : ''}</p>
                    </div>
                )}
                <p className="msg-text">{msg.content}</p>
                {msg.image_url && (
                    <img src={msg.image_url} alt="첨부 이미지" className="attached-image" loading="lazy" />
                )}
                {isLastInGroup && (
                    <span className="msg-time">
                        {!isMe && (senderName + ' · ')}
                        {format(msgDate, 'a h:mm', { locale: ko })}
                    </span>
                )}
            </div>
            {reactionBadges}
        </div>
    );
});
