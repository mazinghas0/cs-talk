import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useTicketStore } from '../../store/ticketStore';
import { Workspace } from '../../types/ticket';
import './JoinWorkspaceView.css';

export const JoinWorkspaceView: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const { session, joinWorkspaceByCode } = useAuthStore();
    const { fetchTickets } = useTicketStore();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchWorkspace = async () => {
            if (!code) return;
            const { data, error } = await supabase
                .from('workspaces')
                .select('id, name, plan_type, created_at, updated_at, owner_id')
                .eq('invite_code', code.toUpperCase())
                .single();

            if (error || !data) {
                setNotFound(true);
            } else {
                setWorkspace(data as Workspace);
            }
            setIsLoading(false);
        };
        fetchWorkspace();
    }, [code]);

    const handleJoin = async () => {
        if (!code) return;

        if (!session) {
            // 로그인 후 돌아오도록 현재 URL 저장
            sessionStorage.setItem('join_redirect', window.location.pathname);
            navigate('/');
            return;
        }

        setIsJoining(true);
        setError('');
        try {
            await joinWorkspaceByCode(code);
            await fetchTickets();
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : '참여에 실패했습니다.');
        } finally {
            setIsJoining(false);
        }
    };

    if (isLoading) {
        return (
            <div className="join-page">
                <div className="join-card">
                    <p className="join-loading">초대 정보를 확인하는 중...</p>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="join-page">
                <div className="join-card">
                    <div className="join-logo">CS Talk</div>
                    <h2>유효하지 않은 초대 링크</h2>
                    <p className="join-desc">초대 코드가 만료되었거나 존재하지 않습니다.<br />담당자에게 새 링크를 요청해 주세요.</p>
                    <button className="btn-join-main" onClick={() => navigate('/')}>
                        홈으로 이동
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="join-page">
            <div className="join-card">
                <div className="join-logo">CS Talk</div>
                <div className="join-ws-badge">{workspace?.name.substring(0, 1).toUpperCase()}</div>
                <h2>{workspace?.name}</h2>
                <p className="join-desc">
                    {session
                        ? '이 워크스페이스에 참여하시겠습니까?'
                        : '참여하려면 먼저 로그인이 필요합니다.'}
                </p>
                {error && <p className="join-error-msg">{error}</p>}
                <button
                    className="btn-join-main"
                    onClick={handleJoin}
                    disabled={isJoining}
                >
                    {isJoining ? '참여 중...' : session ? '참여하기' : '로그인 후 참여하기'}
                </button>
                <button className="btn-join-cancel" onClick={() => navigate('/')}>
                    취소
                </button>
            </div>
        </div>
    );
};
