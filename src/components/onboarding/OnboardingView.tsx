import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { requestNotificationPermission } from '../../utils/pushNotification';
import './OnboardingView.css';

export const OnboardingView: React.FC = () => {
    const { updateProfile } = useAuthStore();
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = fullName.trim();
        if (!trimmed) {
            setError('이름을 입력해주세요.');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            await updateProfile({ full_name: trimmed });
            // 알림 권한 요청 (강제하지 않고 권장)
            await requestNotificationPermission();
        } catch (err: any) {
            setError('저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card">
                <div className="onboarding-header">
                    <span className="onboarding-emoji">👋</span>
                    <h2>CS_talk에 오신 걸 환영합니다!</h2>
                    <p>채팅에서 사용할 이름을 설정해주세요.<br />이름은 이후 프로필 설정에서 변경할 수 있습니다.</p>
                </div>

                {error && (
                    <div className="onboarding-alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form className="onboarding-form" onSubmit={handleSubmit}>
                    <div className="onboarding-input-group">
                        <label>이름 또는 별명</label>
                        <div className="onboarding-input-wrapper">
                            <User size={18} className="onboarding-input-icon" />
                            <input
                                type="text"
                                placeholder="홍길동"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                autoFocus
                                maxLength={30}
                                required
                            />
                        </div>
                        <p className="onboarding-hint">채팅방에서 발신자 이름으로 표시됩니다.</p>
                    </div>

                    <button
                        type="submit"
                        className="onboarding-submit-btn"
                        disabled={isLoading || !fullName.trim()}
                    >
                        {isLoading
                            ? <Loader2 size={20} className="spin" />
                            : <><ArrowRight size={18} /> 시작하기</>
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};
