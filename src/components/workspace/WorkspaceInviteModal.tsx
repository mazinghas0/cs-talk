import React, { useState } from 'react';
import { X, Copy, Check, RefreshCw, UserPlus, Hash } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../../store/authStore';
import { useTicketStore } from '../../store/ticketStore';
import './WorkspaceInviteModal.css';

interface WorkspaceInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'invite' | 'join';

export const WorkspaceInviteModal: React.FC<WorkspaceInviteModalProps> = ({ isOpen, onClose }) => {
    const { currentWorkspace, generateInviteCode, joinWorkspaceByCode } = useAuthStore();
    const { fetchTickets } = useTicketStore();

    const [tab, setTab] = useState<Tab>('invite');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');

    if (!isOpen || !currentWorkspace) return null;

    const inviteUrl = currentWorkspace.invite_code
        ? `${window.location.origin}/join/${currentWorkspace.invite_code}`
        : null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await generateInviteCode(currentWorkspace.id);
        } catch {
            alert('초대 코드 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyUrl = () => {
        if (!inviteUrl) return;
        navigator.clipboard.writeText(inviteUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleCopyCode = () => {
        if (!currentWorkspace.invite_code) return;
        navigator.clipboard.writeText(currentWorkspace.invite_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setIsJoining(true);
        setJoinError('');
        try {
            await joinWorkspaceByCode(joinCode.trim());
            await fetchTickets();
            onClose();
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : '참여에 실패했습니다.');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content invite-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>워크스페이스 초대</h3>
                    <button className="icon-btn-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="invite-tabs">
                    <button
                        className={`invite-tab ${tab === 'invite' ? 'active' : ''}`}
                        onClick={() => setTab('invite')}
                    >
                        <UserPlus size={15} /> 초대하기
                    </button>
                    <button
                        className={`invite-tab ${tab === 'join' ? 'active' : ''}`}
                        onClick={() => setTab('join')}
                    >
                        <Hash size={15} /> 코드로 참여
                    </button>
                </div>

                {tab === 'invite' && (
                    <div className="invite-body">
                        <p className="invite-ws-name">{currentWorkspace.name}</p>
                        <p className="invite-desc">아래 링크나 코드를 공유하면 팀원이 바로 참여할 수 있습니다.</p>

                        {currentWorkspace.invite_code ? (
                            <>
                                <div className="invite-section">
                                    <label>초대 링크</label>
                                    <div className="copy-box">
                                        <input type="text" readOnly value={inviteUrl || ''} />
                                        <button onClick={handleCopyUrl} title="복사">
                                            {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="invite-section">
                                    <label>초대 코드</label>
                                    <div className="invite-code-display">
                                        <span className="invite-code-text">{currentWorkspace.invite_code}</span>
                                        <div className="invite-code-actions">
                                            <button className="btn-copy-code" onClick={handleCopyCode} title="복사">
                                                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                            <button
                                                className="btn-regen"
                                                onClick={handleGenerate}
                                                disabled={isGenerating}
                                                title="재생성"
                                            >
                                                <RefreshCw size={16} className={isGenerating ? 'spin' : ''} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="invite-qr">
                                    <div className="qr-code-wrapper">
                                        <QRCodeSVG
                                            value={inviteUrl || ''}
                                            size={140}
                                            bgColor="#ffffff"
                                            fgColor="#1a1d27"
                                            level="M"
                                        />
                                    </div>
                                    <p>QR 코드 스캔으로 바로 참여</p>
                                </div>
                            </>
                        ) : (
                            <div className="invite-generate-area">
                                <p>아직 초대 코드가 없습니다.</p>
                                <button
                                    className="btn-generate-invite"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? '생성 중...' : '초대 코드 생성하기'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'join' && (
                    <div className="invite-body">
                        <p className="invite-desc">팀원에게 받은 6자리 초대 코드를 입력하세요.</p>
                        <form onSubmit={handleJoin} className="join-form">
                            <input
                                type="text"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                placeholder="ABC123"
                                className="join-code-input"
                                autoFocus
                                maxLength={6}
                            />
                            {joinError && <p className="join-error">{joinError}</p>}
                            <button
                                type="submit"
                                className="btn-join"
                                disabled={isJoining || joinCode.length !== 6}
                            >
                                {isJoining ? '참여 중...' : '워크스페이스 참여하기'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
