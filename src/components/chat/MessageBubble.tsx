import React, { useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Message } from '../../types/ticket';

interface MessageBubbleProps {
    msg: Message;
    isMe: boolean;
    isInternalMsg: boolean;
    isContinued: boolean;
    isLastInGroup: boolean;
    senderName: string;
    onMenuOpen: (pos: { x: number; y: number }, msg: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    msg, isMe, isInternalMsg, isContinued, isLastInGroup, senderName, onMenuOpen,
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

    const bubbleEvents = {
        onContextMenu: handleContextMenu,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };

    if (isInternalMsg) {
        return (
            <div className="message-wrapper internal">
                <div className="message-bubble internal-bubble" {...bubbleEvents}>
                    <p className="msg-text">{msg.content}</p>
                    {msg.image_url && (
                        <img src={msg.image_url} alt="첨부 이미지" className="attached-image" />
                    )}
                    <span className="msg-time">{senderName} · {format(msgDate, 'a h:mm', { locale: ko })}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`message-wrapper ${isMe ? 'admin-res' : 'user-req'} ${isContinued ? 'continued' : ''}`}>
            <div
                className={`message-bubble ${isMe ? 'res-bubble' : 'req-bubble'} ${isContinued ? 'bubble-continued' : ''}`}
                {...bubbleEvents}
            >
                <p className="msg-text">{msg.content}</p>
                {msg.image_url && (
                    <img src={msg.image_url} alt="첨부 이미지" className="attached-image" />
                )}
                {isLastInGroup && (
                    <span className="msg-time">
                        {!isMe && (senderName + ' · ')}
                        {format(msgDate, 'a h:mm', { locale: ko })}
                    </span>
                )}
            </div>
        </div>
    );
};
