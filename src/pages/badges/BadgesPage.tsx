import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { getLevelFromXP } from '@/types';
import type { Badge, UserBadge } from '@/types';

export function BadgesPage() {
    const { totalXP, userBadges } = useAuthStore();
    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBadges = async () => {
        const { data } = await supabase.from('badges').select('*').order('created_at' as keyof Badge);
        setAllBadges((data as Badge[]) ?? []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBadges();
    }, []);

    const earnedIds = new Set(userBadges.map((ub: UserBadge) => ub.badge_id));
    const earned = allBadges.filter((b) => earnedIds.has(b.id));
    const locked = allBadges.filter((b) => !earnedIds.has(b.id));

    const levelInfo = getLevelFromXP(totalXP);

    const getCriteriaText = (badge: Badge): string => {
        const c = badge.criteria;
        if (c.type === 'streak') return `${c.value}일 연속 기록`;
        if (c.type === 'total_experiences') return `기록 ${c.value}개 달성`;
        if (c.type === 'total_xp') return `총 XP ${c.value} 달성`;
        if (c.type === 'category_count') return `${c.category ?? ''} ${c.value}회`;
        return '';
    };

    return (
        <div className="flex flex-col min-h-full bg-surface-2 transition-colors duration-300">
            {/* Header / Level Summary */}
            <div className="bg-surface px-6 pt-14 pb-8 border-b border-border transition-colors relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                
                <p className="text-sm font-bold text-brand-500 mb-1">성장 기록</p>
                <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 transition-colors uppercase italic tracking-tight">{levelInfo.label}</h1>
                
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-400">Level {levelInfo.level}</span>
                        <span className="text-xs font-black text-brand-600">{totalXP} / {levelInfo.nextXP} XP</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 border border-border transition-colors">
                        <div
                            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                            style={{ width: `${Math.min(100, Math.max(5, ((totalXP - levelInfo.currentXP) / (levelInfo.nextXP - levelInfo.currentXP)) * 100))}%` }}
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <div className="flex-1 bg-surface-2 dark:bg-gray-800/40 p-3 rounded-2xl border border-border transition-colors">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">획득 배지</p>
                        <p className="text-lg font-black text-gray-900 dark:text-gray-100">{earned.length} <span className="text-xs font-bold text-gray-400">/ {allBadges.length}</span></p>
                    </div>
                    <div className="flex-1 bg-surface-2 dark:bg-gray-800/40 p-3 rounded-2xl border border-border transition-colors">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">상위 퍼센트</p>
                        <p className="text-lg font-black text-gray-900 dark:text-gray-100">Top 5% <span className="text-xs font-bold text-gray-400">🚀</span></p>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5 space-y-6">
                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer" />)}
                    </div>
                ) : (
                    <>
                        {/* Earned Badges */}
                        {earned.length > 0 && (
                            <div>
                                <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 transition-colors">
                                    <span className="text-brand-500">✅</span> 획득한 배지
                                </h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {earned.map((badge) => (
                                        <BadgeCard key={badge.id} badge={badge} earned={true} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Locked Badges */}
                        {locked.length > 0 && (
                            <div>
                                <h2 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 transition-colors">
                                    <span>🔒</span> 잠긴 배지
                                </h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {locked.map((badge) => (
                                        <BadgeCard key={badge.id} badge={badge} earned={false} criteriaText={getCriteriaText(badge)} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {allBadges.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="text-5xl mb-4">🏅</div>
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">배지를 불러오는 중이에요</p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm">경험을 꼬박꼬박 기록하면 배지를 획득할 수 있어요!</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function BadgeCard({ badge, earned, criteriaText }: { badge: Badge; earned: boolean; criteriaText?: string }) {
    return (
        <div className={`rounded-2xl p-4 border-2 transition-all ${earned
            ? 'bg-surface border-brand-200 dark:border-brand-900/40 shadow-sm'
            : 'bg-surface-2 border-border opacity-60'
            }`}>
            <div className={`text-4xl mb-3 transition-all ${!earned ? 'grayscale' : ''}`}>
                {earned ? badge.icon : '🔒'}
            </div>
            <p className={`font-bold text-sm mb-1 ${earned ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {badge.name}
            </p>
            <p className={`text-xs leading-relaxed ${earned ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {earned ? badge.description : (criteriaText ?? badge.description)}
            </p>
        </div>
    );
}
