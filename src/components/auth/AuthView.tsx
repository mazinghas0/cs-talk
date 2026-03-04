import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import './AuthView.css';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export const AuthView: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                // Handle Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

            } else {
                // Handle Signup
                const { error: signUpError, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        }
                    }
                });

                if (signUpError) throw signUpError;

                // Check if email confirmation is required (default supabase behavior usually requires it unless disabled)
                if (data.user && data.session === null) {
                    setMessage('가입 확인 이메일이 발송되었습니다. 이메일을 확인해주세요.');
                } else {
                    setMessage('회원가입이 완료되었습니다.');
                }
            }
        } catch (err: any) {
            setError(err.message || '인증 과정 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">CS</div>
                    <h2>CS_talk</h2>
                    <p>{isLogin ? '팀 워크스페이스에 로그인하세요' : '새로운 관리자/사용자 계정을 만드세요'}</p>
                </div>

                {error && (
                    <div className="auth-alert error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className="auth-alert success">
                        <span>{message}</span>
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="input-group">
                            <label>이름</label>
                            <div className="input-with-icon">
                                <input
                                    type="text"
                                    placeholder="홍길동"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label>이메일</label>
                        <div className="input-with-icon">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>비밀번호</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                        {isLoading ? <Loader2 size={20} className="spin" /> : (isLogin ? '로그인' : '회원가입')}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
                        <button
                            type="button"
                            className="toggle-mode-btn"
                            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
                        >
                            {isLogin ? '회원가입' : '로그인'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
