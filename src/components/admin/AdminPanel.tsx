import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Shield, Search, Loader2 } from 'lucide-react';
import './AdminPanel.css';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const { user, allProfiles, fetchAllProfiles, updateUserRole } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        setError(null);
        fetchAllProfiles().catch(() => {
            setError('사용자 목록을 불러오지 못했습니다.');
        }).finally(() => setIsLoading(false));
    }, [isOpen, fetchAllProfiles]);

    if (!isOpen) return null;

    const q = searchQuery.trim().toLowerCase();
    const filtered = allProfiles.filter(p =>
        !q ||
        (p.full_name ?? '').toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );

    const handleRoleToggle = async (targetId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const label = newRole === 'admin' ? '관리자' : '일반 사용자';
        if (!window.confirm(`이 사용자를 "${label}"(으)로 변경하시겠습니까?`)) return;

        setUpdatingId(targetId);
        setError(null);
        try {
            await updateUserRole(targetId, newRole);
        } catch (err: any) {
            setError(`권한 변경 실패: ${err?.message ?? '알 수 없는 오류'}\nSupabase 대시보드에서 Admin RLS 정책이 추가됐는지 확인하세요.`);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="admin-overlay" onClick={onClose}>
            <div className="admin-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="admin-header">
                    <div className="admin-header-title">
                        <Shield size={18} />
                        <h3>사용자 관리</h3>
                    </div>
                    <button className="admin-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="admin-search">
                    <Search size={15} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="이름 또는 이메일 검색..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Count */}
                {!isLoading && !error && (
                    <p className="admin-count">총 {filtered.length}명</p>
                )}

                {/* Error */}
                {error && <div className="admin-error">{error}</div>}

                {/* User list */}
                <div className="admin-user-list">
                    {isLoading ? (
                        <div className="admin-empty">
                            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto', display: 'block' }} />
                            <p style={{ marginTop: '0.5rem' }}>불러오는 중...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="admin-empty">검색 결과가 없습니다.</div>
                    ) : (
                        filtered.map(profile => {
                            const isMe = profile.id === user?.id;
                            const isAdmin = profile.role === 'admin';
                            const isUpdating = updatingId === profile.id;

                            return (
                                <div key={profile.id} className="admin-user-item">
                                    <div className="admin-user-info">
                                        <span className="admin-user-name">
                                            {profile.full_name || '(이름 없음)'}
                                        </span>
                                        <span className="admin-user-email">{profile.email}</span>
                                    </div>
                                    <div className="admin-user-actions">
                                        <span className={`role-badge ${profile.role}`}>
                                            {isAdmin ? 'ADMIN' : 'USER'}
                                        </span>
                                        {isMe ? (
                                            <span className="self-badge">나</span>
                                        ) : (
                                            <button
                                                className={`role-toggle-btn ${isAdmin ? 'demote' : 'promote'}`}
                                                onClick={() => handleRoleToggle(profile.id, profile.role)}
                                                disabled={isUpdating}
                                                title={isAdmin ? '일반 사용자로 변경' : '관리자로 승격'}
                                            >
                                                {isUpdating
                                                    ? '...'
                                                    : isAdmin ? '권한 해제' : '관리자 승격'
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
