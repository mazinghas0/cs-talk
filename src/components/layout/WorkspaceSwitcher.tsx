import React from 'react';
import './WorkspaceSwitcher.css';
import { Plus, Check, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTicketStore } from '../../store/ticketStore';
import { Workspace } from '../../types/ticket';

// 워크스페이스 이름 기반 고유 색상 — 동일 이름은 항상 같은 색
const WS_COLORS = [
    '#6366f1', // indigo
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#84cc16', // lime
];

function getWorkspaceColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return WS_COLORS[Math.abs(hash) % WS_COLORS.length];
}

interface WorkspaceSwitcherProps {
    onSelect?: () => void;
    horizontal?: boolean;
    showCreateOnly?: boolean;
    // 사이드바 너비 확장 시 워크스페이스 이름 텍스트 표시
    showName?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
    onSelect,
    horizontal = false,
    showCreateOnly = false,
    showName = false,
}) => {
    const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } = useAuthStore();
    const { fetchTickets, unreadCounts, tickets } = useTicketStore();

    // 현재 워크스페이스의 총 미읽음 수
    const currentWorkspaceUnread = tickets.reduce((sum, t) => sum + (unreadCounts[t.id] || 0), 0);
    const [isCreating, setIsCreating] = React.useState(showCreateOnly);
    const [newName, setNewName] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSelect = (workspace: Workspace) => {
        setCurrentWorkspace(workspace);
        // 워크스페이스 변경 시 티켓 목록 새로고침
        setTimeout(() => fetchTickets(), 0);
        onSelect?.();
    };

    const handleSubmit = async () => {
        if (!newName.trim() || isLoading) return;
        setIsLoading(true);
        try {
            await createWorkspace(newName.trim());
            await fetchTickets();
            setNewName('');
            if (!showCreateOnly) setIsCreating(false);
            onSelect?.();
        } catch {
            alert('워크스페이스 생성에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') {
            setIsCreating(false);
            setNewName('');
        }
    };

    return (
        <div className={`workspace-switcher${horizontal ? ' horizontal' : ''}${showName ? ' show-name' : ''}`}>
            {/* 워크스페이스 목록 버튼들 */}
            {!showCreateOnly && workspaces.map((ws) => {
                const color = getWorkspaceColor(ws.name);
                const isActive = currentWorkspace?.id === ws.id;
                return (
                    <button
                        key={ws.id}
                        className={`workspace-item${isActive ? ' active' : ''}`}
                        onClick={() => handleSelect(ws)}
                        title={ws.name}
                        style={{
                            background: color,
                            borderColor: isActive ? 'white' : color,
                            boxShadow: isActive ? `0 0 0 2px ${color}, 0 4px 12px ${color}55` : `0 2px 8px ${color}44`,
                            color: 'white',
                        }}
                    >
                        <span className="ws-initial">{ws.name.substring(0, 1).toUpperCase()}</span>
                        {showName && (
                            <span className="ws-name-label">{ws.name}</span>
                        )}
                        {isActive && currentWorkspaceUnread > 0 && (
                            <span className="ws-unread-badge">
                                {currentWorkspaceUnread > 99 ? '99+' : currentWorkspaceUnread}
                            </span>
                        )}
                    </button>
                );
            })}

            {/* 만들기 폼 또는 + 버튼 */}
            {isCreating ? (
                <div className={`workspace-create-form${horizontal ? ' horizontal' : ''}`}>
                    <input
                        className="workspace-name-input"
                        type="text"
                        placeholder="팀 이름 입력..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        maxLength={20}
                        disabled={isLoading}
                    />
                    <div className="workspace-create-actions">
                        <button
                            className="workspace-action-btn confirm"
                            onClick={handleSubmit}
                            disabled={!newName.trim() || isLoading}
                            title="만들기"
                        >
                            <Check size={14} />
                        </button>
                        {!showCreateOnly && (
                            <button
                                className="workspace-action-btn cancel"
                                onClick={() => { setIsCreating(false); setNewName(''); }}
                                title="취소"
                                disabled={isLoading}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <button
                    className="workspace-item add-workspace"
                    title="워크스페이스 추가"
                    onClick={() => setIsCreating(true)}
                >
                    <Plus size={20} />
                </button>
            )}
        </div>
    );
};
