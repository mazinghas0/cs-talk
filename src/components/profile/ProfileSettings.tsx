import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Save, User as UserIcon } from 'lucide-react';
import './ProfileSettings.css';

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
    const { profile, updateProfile } = useAuthStore();
    const [fullName, setFullName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content profile-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <UserIcon size={20} />
                        <h3>사용자 프로필 설정</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
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

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                            취소
                        </button>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? '저장 중...' : <><Save size={18} /> 저장하기</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
