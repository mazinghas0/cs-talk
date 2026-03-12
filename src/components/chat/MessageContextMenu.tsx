import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import './MessageContextMenu.css';
import { Copy, Share2, Camera, Trash2 } from 'lucide-react';
import { Message } from '../../types/ticket';

const MENU_WIDTH = 150;
const MENU_HEIGHT_BASE = 144;  // 복사 + 공유 + 캡쳐
const MENU_HEIGHT_WITH_DELETE = 196; // + 삭제

interface Props {
    x: number;
    y: number;
    msg: Message;
    isMe: boolean;
    onClose: () => void;
    onCopy: () => void;
    onShare: () => void;
    onCapture: () => void;
    onDelete: () => void;
}

export const MessageContextMenu: React.FC<Props> = ({ x, y, msg: _msg, isMe, onClose, onCopy, onShare, onCapture, onDelete }) => {
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
