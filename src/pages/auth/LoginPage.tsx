import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

type AuthMode = 'login' | 'signup' | 'magic';

export function LoginPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setMessage(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) throw error;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '구글 로그인 중 오류가 발생했어요. 네트워크 상태를 확인해주세요.';
            setMessage({ type: 'error', text: msg });
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'magic') {
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: window.location.origin }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: '📬 이메일을 확인해 주세요! 로그인 링크를 보냈어요.' });
            } else if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('이메일 또는 비밀번호가 맞지 않아요.');
                    }
                    throw error;
                }
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: window.location.origin }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: '✅ 가입 완료! 이메일을 확인하고 로그인해 주세요.' });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '오류가 발생했어요. 네트워크 상태를 확인해주세요.';
            setMessage({ type: 'error', text: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-brand-50 to-white">
            {/* Logo */}
            <div className="mb-10 text-center animate-fade-in flex flex-col items-center">
                <img src="/favicon.svg?v=2" alt="ValueLog Logo" className="w-24 h-24 mb-6 shadow-md rounded-full bg-white" />
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">ValueLog</h1>
                <p className="text-gray-500 mt-2 text-base">매일 성장을 기록하세요</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm animate-slide-up">
                {/* Mode Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6">
                    {[
                        { key: 'login', label: '로그인' },
                        { key: 'signup', label: '회원가입' },
                        { key: 'magic', label: '이메일 링크' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => { setMode(key as AuthMode); setMessage(null); }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${mode === key
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                        />
                    </div>

                    {mode !== 'magic' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'signup' ? '8자 이상 입력' : '비밀번호 입력'}
                                required
                                minLength={mode === 'signup' ? 8 : undefined}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                            />
                        </div>
                    )}

                    {message && (
                        <div className={`p-4 rounded-2xl text-sm font-medium ${message.type === 'success'
                            ? 'bg-brand-50 text-brand-700'
                            : 'bg-red-50 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <Button
                        type="submit"
                        fullWidth
                        size="lg"
                        loading={loading}
                        className="mt-2"
                    >
                        {mode === 'login' ? '🔑 로그인' : mode === 'signup' ? '🚀 시작하기' : '📨 링크 받기'}
                    </Button>
                </form>

                {mode === 'magic' && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                        이메일로 로그인 링크를 보내드려요. 비밀번호 없이 로그인!
                    </p>
                )}

                <div className="my-6 flex items-center">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <span className="px-4 text-xs text-gray-400 font-medium">또는</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Google 계정으로 계속하기
                </button>
            </div>

            <p className="text-xs text-gray-400 mt-8 text-center">
                ValueLog는 여러분의 성장 여정을 응원합니다 🎯
            </p>
        </div>
    );
}
