import React from 'react';
import './WorkspaceSwitcher.css';
import { Plus, Check, X, Trash2 } from 'lucide-react';
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
    const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace, joinWorkspaceByCode, deleteWorkspace, user } = useAuthStore();
    const { fetchTickets, unreadCounts, tickets } = useTicketStore();

    // 현재 워크스페이스의 총 미읽음 수
    const currentWorkspaceUnread = tickets.reduce((sum, t) => sum + (unreadCounts[t.id] || 0), 0);
    const [isCreating, setIsCreating] = React.useState(showCreateOnly);
    const [isJoining, setIsJoining] = React.useState(false);
    const [showAddMenu, setShowAddMenu] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [joinCode, setJoinCode] = React.useState('');
    const [joinError, setJoinError] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleDelete = async (e: React.MouseEvent, workspace: Workspace) => {
        e.stopPropagation();
        if (!window.confirm(`"${workspace.name}" 워크스페이스를 삭제하시겠습니까?\n\n모든 티켓과 채팅 기록이 영구 삭제됩니다.`)) return;
        try {
            await deleteWorkspace(workspace.id);
        } catch {
            alert('워크스페이스 삭제에 실패했습니다.');
        }
    };

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

    const handleJoinSubmit = async () => {
        if (!joinCode.trim() || isLoading) return;
        setIsLoading(true);
        setJoinError('');
        try {
            await joinWorkspaceByCode(joinCode.trim());
            await fetchTickets();
            setJoinCode('');
            setIsJoining(false);
            onSelect?.();
        } catch {
            setJoinError('유효하지 않은 코드입니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleJoinSubmit();
        if (e.key === 'Escape') { setIsJoining(false); setJoinCode(''); setJoinError(''); }
    };

    return (
        <div className={`workspace-switcher${horizontal ? ' horizontal' : ''}${showName ? ' show-name' : ''}`}>
            {/* 워크스페이스 목록 버튼들 */}
            {!showCreateOnly && workspaces.map((ws) => {
                const color = getWorkspaceColor(ws.name);
                const isActive = currentWorkspace?.id === ws.id;
                const isOwner = ws.owner_id === user?.id;
                return (
                    <div key={ws.id} className="ws-item-wrap">
                        <button
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
                        {isOwner && (
                            <button
                                className="ws-delete-btn"
                                onClick={(e) => handleDelete(e, ws)}
                                title="워크스페이스 삭제"
                            >
                                <Trash2 size={10} />
                            </button>
                        )}
                    </div>
                );
            })}

            {/* 만들기 폼 */}
            {isCreating && (
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
                        <button className="workspace-action-btn confirm" onClick={handleSubmit} disabled={!newName.trim() || isLoading} title="만들기">
                            <Check size={14} />
                        </button>
                        {!showCreateOnly && (
                            <button className="workspace-action-btn cancel" onClick={() => { setIsCreating(false); setNewName(''); }} title="취소" disabled={isLoading}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 코드로 참여 폼 */}
            {isJoining && (
                <div className={`workspace-create-form${horizontal ? ' horizontal' : ''}`}>
                    <input
                        className="workspace-name-input"
                        type="text"
                        placeholder="초대 코드 입력..."
                        value={joinCode}
                        onChange={(e) => { setJoinCode(e.target.value); setJoinError(''); }}
                        onKeyDown={handleJoinKeyDown}
                        autoFocus
                        maxLength={12}
                        disabled={isLoading}
                    />
                    {joinError && <p className="ws-join-error">{joinError}</p>}
                    <div className="workspace-create-actions">
                        <button className="workspace-action-btn confirm" onClick={handleJoinSubmit} disabled={!joinCode.trim() || isLoading} title="참여">
                            <Check size={14} />
                        </button>
                        <button className="workspace-action-btn cancel" onClick={() => { setIsJoining(false); setJoinCode(''); setJoinError(''); }} title="취소" disabled={isLoading}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* + 버튼 + 미니 메뉴 */}
            {!isCreating && !isJoining && !showCreateOnly && (
                <div className="ws-add-wrapper">
                    <button
                        className={`workspace-item add-workspace${showAddMenu ? ' active-menu' : ''}`}
                        title="워크스페이스 추가"
                        onClick={() => setShowAddMenu(v => !v)}
                    >
                        <Plus size={20} />
                    </button>
                    {showAddMenu && (
                        <div className="ws-add-menu">
                            <button className="ws-add-menu-item" onClick={() => { setShowAddMenu(false); setIsCreating(true); }}>
                                <Plus size={14} /> 새로 만들기
                            </button>
                            <button className="ws-add-menu-item" onClick={() => { setShowAddMenu(false); setIsJoining(true); }}>
                                <Check size={14} /> 코드로 참여
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
