import { useAuthStore } from '@/store/authStore';
import { getLevelFromXP, CATEGORIES } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, Trophy, ChevronRight, Plus } from 'lucide-react';

export function HomePage() {
    const { profile, dailyProgress, totalXP, userBadges, user, dominantCategory, frequentCategories } = useAuthStore();
    const navigate = useNavigate();
    const [weeklyDone, setWeeklyDone] = useState(0);

    const levelInfo = getLevelFromXP(totalXP, dominantCategory);
    const xpProgress = totalXP - levelInfo.currentXP;
    const xpRange = levelInfo.nextXP - levelInfo.currentXP;
    const progressPct = Math.min(100, Math.round((xpProgress / xpRange) * 100));

    const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
    const isCompleted = dailyProgress?.completed ?? false;
    const streak = dailyProgress?.streak_count ?? 0;
    const growthStreak = dailyProgress?.growth_streak_count ?? 0;
    const weeklyGoal = profile?.weekly_goal ?? 3;

    useEffect(() => {
        if (!user) return;
        // 이번 주 월요일부터 오늘까지의 experience 개수 카운트
        const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000); // KST
        const dayOfWeek = now.getUTCDay(); // 0=일, 1=월, ...
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7)); // 월요일로
        const mondayStr = monday.toISOString().split('T')[0]!;
        const todayStr = now.toISOString().split('T')[0]!;

        supabase
            .from('experiences')
            .select('local_date', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('local_date', mondayStr)
            .lte('local_date', todayStr)
            .then(({ count }) => setWeeklyDone(count ?? 0));
    }, [user, dailyProgress]);

    return (
        <div className="flex flex-col min-h-full bg-surface-2 transition-colors duration-300">
            {/* Header */}
            <div className="bg-surface px-5 pt-12 pb-6 border-b border-border transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-gray-400 text-sm">{today}</p>
                        <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 transition-colors duration-300">
                            안녕하세요, <span className="text-brand-500">{profile?.display_name ?? '게스트'}</span>님! 👋
                        </h1>
                    </div>
                    {/* Streak Badges */}
                    <div className="flex items-center gap-2">
                        <div className={`flex flex-col items-center px-3 py-2 rounded-2xl ${streak > 0 ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <span className="text-2xl">{streak > 0 ? '🔥' : '💤'}</span>
                            <span className={`text-xs font-bold mt-0.5 ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`}>{streak}일</span>
                        </div>
                        {growthStreak > 0 && (
                            <div className="flex flex-col items-center px-3 py-2 rounded-2xl bg-green-50 dark:bg-green-950/30">
                                <span className="text-2xl">🌿</span>
                                <span className="text-xs font-bold mt-0.5 text-green-600">{growthStreak}일</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* XP / Level Bar */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Star size={16} className="text-xp-500 fill-xp-400" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Lv.{levelInfo.level} {levelInfo.label}</span>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">{totalXP} / {levelInfo.nextXP} XP</span>
                    </div>
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden transition-colors">
                        <div
                            className="h-full bg-gradient-to-r from-xp-400 to-xp-500 rounded-full animate-progress-fill transition-all duration-700"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-5 py-5 space-y-4 flex-1">

                {/* Today's Quest Card */}
                <div
                    onClick={() => !isCompleted && navigate('/quest')}
                    className={`relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-200 active:scale-95 ${isCompleted
                        ? 'bg-gradient-to-br from-brand-400 to-brand-600'
                        : 'bg-gradient-to-br from-brand-500 to-brand-700'
                        }`}
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                                {isCompleted ? '✅ 완료' : '⚡ 오늘의 퀘스트'}
                            </span>
                        </div>

                        {isCompleted ? (
                            <>
                                <h2 className="text-white text-xl font-extrabold mb-1">오늘 퀘스트 완료!</h2>
                                <p className="text-white/80 text-sm">정말 대단해요 🎉</p>
                                <p className="text-white/70 text-xs mt-3">내일도 연속 기록에 도전해봐요</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-white text-xl font-extrabold mb-1">오늘의 퀘스트를 완료해 볼까요?</h2>
                                <p className="text-white/80 text-sm">짧게 몇 문항만 답하면 끝 ✨</p>
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                                        <span className="text-xp-400 text-sm">⭐</span>
                                        <span className="text-white text-sm font-bold">+20 XP</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                                        <span className="text-sm">🔥</span>
                                        <span className="text-white text-sm font-bold">스트릭</span>
                                    </div>
                                    <div className="ml-auto bg-white text-brand-600 rounded-2xl px-5 py-2.5 font-bold text-sm flex items-center gap-1.5">
                                        시작 <ChevronRight size={16} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Decorative circles */}
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard icon="🔥" label="스트릭" value={`${streak}일`} color="orange" />
                    <StatCard icon="⭐" label="총 XP" value={`${totalXP}`} color="yellow" />
                    <StatCard icon="🏅" label="배지" value={`${userBadges.length}개`} color="purple" />
                </div>

                {/* Weekly Goal */}
                <div className="bg-white dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Trophy size={18} className="text-brand-500" />
                            <span className="font-bold text-gray-800 dark:text-gray-100">이번주 목표</span>
                        </div>
                        <span className="text-sm text-gray-400">{weeklyDone} / {weeklyGoal}회</span>
                    </div>
                    <div className="flex gap-2">
                        {Array.from({ length: weeklyGoal }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-2.5 flex-1 rounded-full transition-all duration-500 ${i < weeklyDone ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {weeklyDone >= weeklyGoal ? '🎉 이번 주 목표 달성!' : `${weeklyGoal - weeklyDone}번 더 기록하면 목표 달성!`}
                    </p>
                </div>

                {/* Quick Categories */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-800 dark:text-gray-100">자주 쓰는 카테고리</span>
                        <button onClick={() => navigate('/timeline')} className="text-brand-500 text-sm font-semibold">전체보기</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {(() => {
                            let display = frequentCategories?.slice(0, 3) || [];
                            if (display.length === 0) {
                                display = ['experience', 'study', 'daily'];
                            } else if (display.length < 3) {
                                const fallbacks = ['experience', 'study', 'daily', 'exercise'];
                                for (const fallback of fallbacks) {
                                    if (display.length >= 3) break;
                                    if (!display.includes(fallback)) display.push(fallback);
                                }
                            }
                            return display.map((key) => {
                                const cat = CATEGORIES[key];
                                if (!cat) return null;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => navigate('/quest', { state: { category: key } })}
                                        className="flex flex-col items-center gap-2 bg-white dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 hover:border-brand-200 transition-all duration-200 active:scale-95"
                                    >
                                        <span className="text-2xl">{cat.icon}</span>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{cat.label}</span>
                                    </button>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* FAB */}
                <div className="fixed bottom-24 right-5 z-60">
                    <button
                        onClick={() => navigate('/quest')}
                        className="w-14 h-14 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
                    >
                        <Plus size={26} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div >
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    const colors: Record<string, string> = {
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400',
        yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400',
    };
    return (
        <div className={`rounded-2xl p-4 text-center ${colors[color] ?? 'bg-gray-50'}`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className="font-extrabold text-lg leading-tight">{value}</div>
            <div className="text-xs opacity-70 mt-0.5">{label}</div>
        </div>
    );
}
