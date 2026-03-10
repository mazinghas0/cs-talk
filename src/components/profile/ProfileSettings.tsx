import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Save, User as UserIcon, Bell, BellOff, LogOut } from 'lucide-react';
import './ProfileSettings.css';

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
    const { profile, updateProfile, signOut } = useAuthStore();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [fullName, setFullName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
        }
        if (typeof Notification !== 'undefined') {
            setNotifPermission(Notification.permission);
        }
    }, [profile, isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile({ full_name: fullName });
            onClose();
        } catch (error) {
            alert('프로필 저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const requestNotificationPermission = async () => {
        if (typeof Notification === 'undefined') return;

        try {
            const permission = await Notification.requestPermission();
            setNotifPermission(permission);
            if (permission === 'granted') {
                new Notification('CS Talk', {
                    body: '알림 설정이 완료되었습니다.',
                    icon: '/icon-192.png'
                });
            }
        } catch (err) {
            console.error('Notification Error:', err);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <div className="profile-icon-wrapper">
                            <UserIcon size={24} />
                        </div>
                        <h3>내 프로필 수정</h3>
                    </div>
                    <button className="icon-btn-close" onClick={onClose}><X size={20} /></button>
                </div>


                <form onSubmit={handleSave} className="profile-form">
                    <div className="form-group">
                        <label>이메일 계정</label>
                        <input type="text" value={profile?.email || ''} disabled className="disabled-input" />
                        <p className="input-helper">계정 이메일은 변경할 수 없습니다.</p>
                    </div>

                    <div className="form-group">
                        <label>별명 / 이름</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="채팅에 표시될 이름을 입력하세요"
                            required
                        />
                        <p className="input-helper">입력하신 이름이 채팅방 발신자로 표시됩니다.</p>
                    </div>

                    <div className="form-group notification-group">
                        <label>시스템 알림 설정</label>
                        <div className="notification-status-box">
                            <div className="status-info">
                                {notifPermission === 'granted' ? (
                                    <><Bell size={18} className="icon-granted" /> <span>알림 활성화됨</span></>
                                ) : notifPermission === 'denied' ? (
                                    <><BellOff size={18} className="icon-denied" /> <span>알림 차단됨</span></>
                                ) : (
                                    <><Bell size={18} /> <span>알림 비활성화됨</span></>
                                )}
                            </div>
                            {notifPermission !== 'granted' && (
                                <button
                                    type="button"
                                    className="btn-notif-request"
                                    onClick={requestNotificationPermission}
                                >
                                    알림 권한 요청
                                </button>
                            )}
                        </div>
                        <p className="input-helper">
                            {notifPermission === 'denied'
                                ? '브라우저 설정에서 알림 권한을 직접 허용해야 합니다.'
                                : '새 메시지가 도착했을 때 실시간 알림을 받습니다.'}
                        </p>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-logout"
                            onClick={async () => {
                                setIsSigningOut(true);
                                await signOut();
                            }}
                            disabled={isSigningOut}
                        >
                            <LogOut size={16} />
                            {isSigningOut ? '로그아웃 중...' : '로그아웃'}
                        </button>
                        <div className="modal-footer-right">
                            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                                취소
                            </button>
                            <button type="submit" className="btn-primary" disabled={isSaving}>
                                {isSaving ? '저장 중...' : <><Save size={18} /> 저장하기</>}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
