import React from 'react';
import './ShortcutsModal.css';
import { X } from 'lucide-react';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { category: '채팅', items: [
        { keys: ['Enter'], desc: '메시지 전송' },
        { keys: ['Shift', 'Enter'], desc: '줄바꿈' },
        { keys: ['Esc'], desc: '채팅 닫기 (모바일)' },
    ]},
    { category: '사이드바', items: [
        { keys: ['Ctrl', '/'], desc: '단축키 안내 열기/닫기' },
    ]},
    { category: '일반', items: [
        { keys: ['Esc'], desc: '모달/팝업 닫기' },
        { keys: ['Tab'], desc: '포커스 이동' },
    ]},
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
    React.useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
                <div className="shortcuts-header">
                    <h3>키보드 단축키</h3>
                    <button className="icon-btn-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="shortcuts-body">
                    {SHORTCUTS.map(group => (
                        <div key={group.category} className="shortcut-group">
                            <p className="shortcut-category">{group.category}</p>
                            {group.items.map((item, i) => (
                                <div key={i} className="shortcut-row">
                                    <div className="shortcut-keys">
                                        {item.keys.map((k, j) => (
                                            <React.Fragment key={k}>
                                                <kbd className="shortcut-key">{k}</kbd>
                                                {j < item.keys.length - 1 && <span className="shortcut-plus">+</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <span className="shortcut-desc">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <p className="shortcuts-footer">Ctrl + / 로 언제든 열 수 있습니다</p>
            </div>
        </div>
    );
};
