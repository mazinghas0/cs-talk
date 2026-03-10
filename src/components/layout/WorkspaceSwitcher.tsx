import React from 'react';
import './WorkspaceSwitcher.css';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTicketStore } from '../../store/ticketStore';

export const WorkspaceSwitcher: React.FC = () => {
    const { workspaces, currentWorkspace, setCurrentWorkspace } = useAuthStore();
    const { fetchTickets } = useTicketStore();

    const handleSelect = (workspace: any) => {
        setCurrentWorkspace(workspace);
        // 워크스페이스 변경 시 티켓 목록 새로고침
        setTimeout(() => fetchTickets(), 0);
    };

    return (
        <div className="workspace-switcher">
            {workspaces.map((ws) => (
                <button
                    key={ws.id}
                    className={`workspace-item ${currentWorkspace?.id === ws.id ? 'active' : ''}`}
                    onClick={() => handleSelect(ws)}
                    title={ws.name}
                >
                    {ws.name.substring(0, 1).toUpperCase()}
                </button>
            ))}
            <button className="workspace-item add-workspace" title="워크스페이스 추가">
                <Plus size={20} />
            </button>
        </div>
    );
};
