import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Badge, UserBadge } from '@/types';

export function BadgesPage() {
    const { userBadges } = useAuthStore();
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
            {/* Header */}
            <div className="bg-surface px-5 pt-12 pb-5 border-b border-border transition-colors">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">배지</h1>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 transition-colors">
                    {earned.length} / {allBadges.length}개 획득
                </p>

                {/* Progress */}
                {allBadges.length > 0 && (
                    <div className="mt-3">
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden transition-colors">
                            <div
                                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-700"
                                style={{ width: `${Math.round((earned.length / allBadges.length) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}
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
                                <p className="text-gray-400 dark:text-gray-500 text-sm">퀘스트를 완료하면 배지를 획득할 수 있어요!</p>
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
