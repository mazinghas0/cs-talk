import React from 'react';
import './WorkspaceSwitcher.css';
import { Plus, Check, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTicketStore } from '../../store/ticketStore';
import { Workspace } from '../../types/ticket';

interface WorkspaceSwitcherProps {
    // 워크스페이스 선택 후 실행할 콜백 (모바일 모달 닫기 등에 활용)
    onSelect?: () => void;
    // 가로 배치 모드 (모바일 시트에서 사용)
    horizontal?: boolean;
    // 만들기 폼만 표시 (워크스페이스가 없을 때 안내 화면에서 사용)
    showCreateOnly?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
    onSelect,
    horizontal = false,
    showCreateOnly = false,
}) => {
    const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } = useAuthStore();
    const { fetchTickets } = useTicketStore();
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
        <div className={`workspace-switcher${horizontal ? ' horizontal' : ''}`}>
            {/* 워크스페이스 목록 버튼들 */}
            {!showCreateOnly && workspaces.map((ws) => (
                <button
                    key={ws.id}
                    className={`workspace-item${currentWorkspace?.id === ws.id ? ' active' : ''}`}
                    onClick={() => handleSelect(ws)}
                    title={ws.name}
                >
                    {ws.name.substring(0, 1).toUpperCase()}
                </button>
            ))}

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
