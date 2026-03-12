import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './MessageContextMenu.css';
import { Copy, Share2 } from 'lucide-react';
import { Message } from '../../types/ticket';

const MENU_WIDTH = 150;
const MENU_HEIGHT = 96; // 2 항목 × 48px

interface Props {
    x: number;
    y: number;
    msg: Message;
    onClose: () => void;
    onCopy: () => void;
    onShare: () => void;
}

export const MessageContextMenu: React.FC<Props> = ({ x, y, msg: _msg, onClose, onCopy, onShare }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        // setTimeout 0: 트리거 이벤트가 즉시 닫히는 것 방지
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

    // 화면 경계 벗어남 보정
    const adjustedX = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
    const adjustedY = y + MENU_HEIGHT > window.innerHeight ? y - MENU_HEIGHT - 4 : y + 4;

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
        </div>
    );

    return ReactDOM.createPortal(menu, document.body);
};
