import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Save, User as UserIcon, Bell, BellOff, LogOut, Camera, Volume2, VolumeX } from 'lucide-react';
import { subscribeUserToPush } from '../../utils/pushNotification';
import { getNotifSettings, saveNotifSettings, previewSound, SoundType } from '../../utils/notificationSettings';
import './ProfileSettings.css';

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
    const { profile, updateProfile, signOut, user, uploadAvatar } = useAuthStore();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [fullName, setFullName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [soundType, setSoundType] = useState<SoundType>('ding');

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
        }
        if (typeof Notification !== 'undefined') {
            setNotifPermission(Notification.permission);
        }
        // 모달 열릴 때 프리뷰 초기화
        setAvatarPreview(null);
        setAvatarFile(null);
        setAvatarError(null);
        // 알림 설정 로드
        const s = getNotifSettings();
        setNotifEnabled(s.enabled);
        setSoundEnabled(s.soundEnabled);
        setSoundType(s.soundType);
    }, [profile, isOpen]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setAvatarError('파일 크기는 2MB 이하여야 합니다.');
            return;
        }
        setAvatarError(null);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = fullName.trim();
        if (!trimmed) return;
        setIsSaving(true);
        try {
            if (avatarFile) {
                await uploadAvatar(avatarFile);
            }
            await updateProfile({ full_name: trimmed });
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
                if (user?.id) {
                    await subscribeUserToPush(user.id);
                }
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
                    {/* 아바타 업로드 */}
                    <div className="avatar-upload-section">
                        <div className="avatar-circle-wrap" onClick={() => fileInputRef.current?.click()}>
                            {(avatarPreview || profile?.avatar_url) ? (
                                <img
                                    src={avatarPreview ?? profile?.avatar_url ?? ''}
                                    alt="프로필 사진"
                                    className="avatar-img"
                                />
                            ) : (
                                <span className="avatar-initial">
                                    {(profile?.full_name ?? profile?.email ?? '?').substring(0, 1).toUpperCase()}
                                </span>
                            )}
                            <div className="avatar-overlay">
                                <Camera size={18} />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                        <div className="avatar-upload-info">
                            <p className="avatar-upload-label">프로필 사진</p>
                            <p className="input-helper">JPG, PNG, WebP (최대 2MB)</p>
                            {avatarError && <p className="avatar-error">{avatarError}</p>}
                        </div>
                    </div>

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

                        {/* 브라우저 권한 상태 */}
                        <div className="notification-status-box">
                            <div className="status-info">
                                {notifPermission === 'granted' ? (
                                    <><Bell size={18} className="icon-granted" /> <span>브라우저 알림 허용됨</span></>
                                ) : notifPermission === 'denied' ? (
                                    <><BellOff size={18} className="icon-denied" /> <span>브라우저 알림 차단됨</span></>
                                ) : (
                                    <><Bell size={18} /> <span>브라우저 알림 미설정</span></>
                                )}
                            </div>
                            {notifPermission !== 'granted' && (
                                <button
                                    type="button"
                                    className="btn-notif-request"
                                    onClick={requestNotificationPermission}
                                >
                                    권한 요청
                                </button>
                            )}
                        </div>

                        {/* 앱 알림 on/off 토글 */}
                        <div className="notif-toggle-row">
                            <div className="notif-toggle-label">
                                <Bell size={16} />
                                <span>앱 알림</span>
                                <p className="toggle-desc">새 메시지·티켓 알림 수신</p>
                            </div>
                            <button
                                type="button"
                                className={`toggle-switch${notifEnabled ? ' on' : ''}`}
                                onClick={() => {
                                    const next = !notifEnabled;
                                    setNotifEnabled(next);
                                    saveNotifSettings({ enabled: next });
                                }}
                            >
                                <span className="toggle-knob" />
                            </button>
                        </div>

                        {/* 알림음 on/off 토글 */}
                        <div className="notif-toggle-row">
                            <div className="notif-toggle-label">
                                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                <span>알림음</span>
                                <p className="toggle-desc">알림 수신 시 소리 재생</p>
                            </div>
                            <button
                                type="button"
                                className={`toggle-switch${soundEnabled ? ' on' : ''}`}
                                onClick={() => {
                                    const next = !soundEnabled;
                                    setSoundEnabled(next);
                                    saveNotifSettings({ soundEnabled: next });
                                }}
                            >
                                <span className="toggle-knob" />
                            </button>
                        </div>

                        {/* 알림음 종류 선택 */}
                        {soundEnabled && (
                            <div className="sound-picker">
                                <p className="sound-picker-label">알림음 선택</p>
                                <div className="sound-options">
                                    {(['ding', 'pop', 'chime'] as SoundType[]).map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`sound-option${soundType === s ? ' selected' : ''}`}
                                            onClick={() => {
                                                setSoundType(s);
                                                saveNotifSettings({ soundType: s });
                                                previewSound(s);
                                            }}
                                        >
                                            <span className="sound-icon">
                                                {s === 'ding' ? '🔔' : s === 'pop' ? '💬' : '🎵'}
                                            </span>
                                            <span className="sound-name">
                                                {s === 'ding' ? 'Ding' : s === 'pop' ? 'Pop' : 'Chime'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="input-helper">
                            {notifPermission === 'denied'
                                ? '브라우저 설정에서 알림 권한을 직접 허용해야 합니다.'
                                : '설정은 이 기기에 저장됩니다.'}
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
