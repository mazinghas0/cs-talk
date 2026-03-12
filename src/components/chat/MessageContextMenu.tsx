import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './MessageContextMenu.css';
import { Copy, Share2, Camera, MessageSquareReply, Trash2 } from 'lucide-react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
import { Message } from '../../types/ticket';

const MENU_WIDTH = 200;
const MENU_HEIGHT_BASE = 240;  // 이모지 피커 + 복사 + 공유 + 캡쳐 + 댓글
const MENU_HEIGHT_WITH_DELETE = 292; // + 삭제

interface Props {
    x: number;
    y: number;
    msg: Message;
    isMe: boolean;
    myReactions: string[]; // 내가 이미 누른 이모지 목록
    onClose: () => void;
    onCopy: () => void;
    onShare: () => void;
    onCapture: () => void;
    onReply: () => void;
    onReact: (emoji: string) => void;
    onDelete: () => void;
}

export const MessageContextMenu: React.FC<Props> = ({ x, y, msg: _msg, isMe, myReactions, onClose, onCopy, onShare, onCapture, onReply, onReact, onDelete }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleOutside);
            document.addEventListener('touchstart', handleOutside);
            document.addEventListener('keydown', handleKey);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('touchstart', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    const menuHeight = isMe ? MENU_HEIGHT_WITH_DELETE : MENU_HEIGHT_BASE;
    const adjustedX = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight - 4 : y + 4;

    const menu = (
        <div
            ref={menuRef}
            className="msg-context-menu"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {/* 이모지 피커 */}
            <div className="msg-ctx-emoji-row">
                {EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        className={`msg-ctx-emoji-btn${myReactions.includes(emoji) ? ' active' : ''}`}
                        onClick={() => { onReact(emoji); onClose(); }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <div className="msg-ctx-divider" />
            <button className="msg-ctx-item" onClick={onCopy}>
                <Copy size={14} />
                <span>복사</span>
            </button>
            <button className="msg-ctx-item" onClick={onShare}>
                <Share2 size={14} />
                <span>공유</span>
            </button>
            <button className="msg-ctx-item" onClick={onCapture}>
                <Camera size={14} />
                <span>캡쳐</span>
            </button>
            <button className="msg-ctx-item" onClick={onReply}>
                <MessageSquareReply size={14} />
                <span>댓글</span>
            </button>
            {isMe && (
                <>
                    <div className="msg-ctx-divider" />
                    {confirmDelete ? (
                        <button className="msg-ctx-item danger" onClick={onDelete}>
                            <Trash2 size={14} />
                            <span>정말 삭제할까요?</span>
                        </button>
                    ) : (
                        <button className="msg-ctx-item danger" onClick={() => setConfirmDelete(true)}>
                            <Trash2 size={14} />
                            <span>삭제</span>
                        </button>
                    )}
                </>
            )}
        </div>
    );

    return ReactDOM.createPortal(menu, document.body);
};
