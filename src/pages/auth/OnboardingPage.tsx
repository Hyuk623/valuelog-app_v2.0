import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/types';

const WEEKLY_GOALS = [
    { value: 2, label: '주 2회', desc: '가볍게 시작' },
    { value: 3, label: '주 3회', desc: '꾸준히 도전' },
    { value: 5, label: '주 5회', desc: '열심히 기록' },
    { value: 7, label: '매일', desc: '완전 몰입' },
];

export function OnboardingPage() {
    const navigate = useNavigate();
    const { user, fetchProfile } = useAuthStore();
    const [step, setStep] = useState(1);
    const [displayName, setDisplayName] = useState('');
    const [weeklyGoal, setWeeklyGoal] = useState(3);
    const [interests, setInterests] = useState<string[]>([]);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleInterest = (key: string) => {
        setInterests((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const handleComplete = async () => {
        if (!user) return;
        if (!displayName.trim()) { setError('닉네임을 입력해 주세요.'); return; }
        if (interests.length === 0) { setError('관심 카테고리를 1개 이상 선택해 주세요.'); return; }
        if (!agreedToPrivacy) { setError('개인정보 처리방침 및 연령 확인에 동의해 주세요.'); return; }

        setLoading(true);
        setError('');

        const { error: dbErr } = await supabase.from('profiles').upsert({
            user_id: user.id,
            display_name: displayName.trim(),
            weekly_goal: weeklyGoal,
            interests,
            timezone: 'Asia/Seoul',
        });

        if (dbErr) {
            setError('저장 중 오류가 생겼어요. 다시 시도해 주세요.');
            setLoading(false);
            return;
        }

        await fetchProfile(user.id);
        navigate('/', { replace: true });
    };

    return (
        <div className="min-h-screen flex flex-col px-6 py-10 bg-gradient-to-b from-brand-50 to-white overflow-y-auto">
            {/* Progress */}
            <div className="flex gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-brand-500' : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>

            {/* Step 1: Name */}
            {step === 1 && (
                <div className="flex-1 animate-slide-up">
                    <div className="text-4xl mb-4">👋</div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">반가워요!</h2>
                    <p className="text-gray-500 mb-8">어떻게 불러드릴까요?</p>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="닉네임 입력 (예: 민준이)"
                        maxLength={20}
                        className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 text-xl font-semibold text-gray-900 placeholder-gray-300 focus:outline-none focus:border-brand-400 transition-all"
                        autoFocus
                    />
                    <Button
                        fullWidth
                        size="lg"
                        className="mt-6"
                        onClick={() => {
                            if (!displayName.trim()) { setError('닉네임을 입력해주세요.'); return; }
                            setError('');
                            setStep(2);
                        }}
                    >
                        다음 →
                    </Button>
                </div>
            )}

            {/* Step 2: Weekly Goal */}
            {step === 2 && (
                <div className="flex-1 animate-slide-up">
                    <div className="text-4xl mb-4">🎯</div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">목표를 정해요</h2>
                    <p className="text-gray-500 mb-8">일주일에 몇 번 기록할 계획인가요?</p>
                    <div className="space-y-3">
                        {WEEKLY_GOALS.map(({ value, label, desc }) => (
                            <button
                                key={value}
                                onClick={() => setWeeklyGoal(value)}
                                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${weeklyGoal === value
                                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <span className="font-bold text-lg">{label}</span>
                                <span className={`text-sm ${weeklyGoal === value ? 'text-brand-500' : 'text-gray-400'}`}>{desc}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" size="lg" onClick={() => setStep(1)} className="flex-1">← 이전</Button>
                        <Button size="lg" onClick={() => setStep(3)} className="flex-1">다음 →</Button>
                    </div>
                </div>
            )}

            {/* Step 3: Categories & Consent */}
            {step === 3 && (
                <div className="flex-1 animate-slide-up pb-10">
                    <div className="text-4xl mb-4">✨</div>
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-2">관심 분야 선택</h2>
                    <p className="text-gray-500 mb-6">어떤 활동을 주로 기록할 건가요? (복수 선택)</p>
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                            <button
                                key={key}
                                onClick={() => toggleInterest(key)}
                                className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all duration-200 ${interests.includes(key)
                                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <span className="text-2xl">{icon}</span>
                                <span className="font-semibold text-sm">{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreedToPrivacy}
                                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            />
                            <div className="text-sm text-gray-700">
                                <p className="font-semibold text-gray-900 mb-1">개인정보 보호 및 연령 확인 (필수)</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    본인은 <strong>만 14세 이상</strong>이거나 법정대리인의 동의를 받았으며, 서비스 이용을 위해 민감정보(경험기록 등)를 포함한
                                    <span className="underline ml-1 cursor-pointer">개인정보 처리방침</span>에 동의합니다.
                                </p>
                            </div>
                        </label>
                    </div>

                    {error && <p className="text-red-500 text-sm font-medium mb-4">{error}</p>}

                    <div className="flex gap-3">
                        <Button variant="secondary" size="lg" onClick={() => setStep(2)} className="flex-1">← 이전</Button>
                        <Button size="lg" onClick={handleComplete} loading={loading} className="flex-1 disabled:opacity-50">
                            시작하기 🚀
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
