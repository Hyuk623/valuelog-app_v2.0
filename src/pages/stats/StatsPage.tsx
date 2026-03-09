import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { getLocalDateKST, CATEGORIES } from '@/types';
import { COMPETENCY_MAP, getPersona } from '@/lib/competencies';
// import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsData {
    // 30일
    totalRecords30: number;
    evidenceCount30: number;
    evidenceRatio30: number;
    impactSignalCount30: number;
    impactRatio30: number;
    competencyCoverage: number;    // 서로 다른 역량 개수
    distinctCategories30: number;
    totalXP30: number;
    // 주간 목표
    weeklyGoal: number;
    thisWeekCount: number;
    weeklyAchievementPct: number;
    // 모멘텀 (최근 7일 vs 이전 7일)
    recent7Count: number;
    prev7Count: number;
    recent7XP: number;
    prev7XP: number;
    // 성장 스트릭
    currentStreak: number;
    currentGrowthStreak: number;
    // 커리어 코칭
    totalRecords: number;
    topCategories: { category: string; count: number }[];
    topCompetencies: { competencyKey: string; count: number }[];
}

type Insight = { type: 'warning' | 'tip' | 'praise'; text: string };

function calcInsights(stats: StatsData): Insight[] {
    const insights: Insight[] = [];
    if (stats.evidenceRatio30 < 0.3 && stats.totalRecords30 >= 3) {
        insights.push({ type: 'tip', text: '오늘은 증빙 링크 1개만 붙여보세요. 신뢰도가 확 올라가요 🔖' });
    }
    if (stats.impactRatio30 < 0.2 && stats.totalRecords30 >= 3) {
        insights.push({ type: 'tip', text: '전/후 수치 1줄만 추가해보세요. "2시간→45분" 같은 것도 훌륭해요 📊' });
    }
    if (stats.distinctCategories30 <= 2 && stats.totalRecords30 >= 5) {
        insights.push({ type: 'tip', text: '내일은 다른 카테고리로 1회 기록 도전해보세요! 🌈' });
    }
    if (stats.weeklyAchievementPct >= 100) {
        insights.push({ type: 'praise', text: '이번 주 목표 달성! 정말 잘하고 있어요 🎉' });
    }
    if (stats.currentGrowthStreak >= 3) {
        insights.push({ type: 'praise', text: `성장 스트릭 ${stats.currentGrowthStreak}일! 증거 포함 기록이 습관이 되고 있어요 🌿` });
    }
    return insights.slice(0, 3);
}

export function StatsPage() {
    const { user, profile, dailyProgress } = useAuthStore();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadStats();
    }, [user]);

    const loadStats = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const today = getLocalDateKST();
            const d30 = new Date(new Date().getTime() + 9 * 3600_000);
            d30.setUTCDate(d30.getUTCDate() - 30);
            const date30 = d30.toISOString().split('T')[0]!;
            const d7 = new Date(new Date().getTime() + 9 * 3600_000);
            d7.setUTCDate(d7.getUTCDate() - 7);
            const date7 = d7.toISOString().split('T')[0]!;
            const d14 = new Date(new Date().getTime() + 9 * 3600_000);
            d14.setUTCDate(d14.getUTCDate() - 14);
            const date14 = d14.toISOString().split('T')[0]!;

            // 주 시작 (월요일)
            const nowKST = new Date(new Date().getTime() + 9 * 3600_000);
            const dow = nowKST.getUTCDay();
            const diffMon = (dow + 6) % 7;
            const weekStart = new Date(nowKST);
            weekStart.setUTCDate(weekStart.getUTCDate() - diffMon);
            const weekStartStr = weekStart.toISOString().split('T')[0]!;

            const [
                { data: allExps },
                { data: allComps },
                { data: dp7data },
                { data: dpWeek },
                { data: dp7prev },
            ] = await Promise.all([
                supabase.from('experiences').select('id,category,trust_label,impact_signal,local_date').eq('user_id', user.id),
                supabase.from('experience_competencies').select('competency_key,experience_id').in('experience_id',
                    (await supabase.from('experiences').select('id').eq('user_id', user.id)).data?.map((e: { id: string }) => e.id) ?? []
                ),
                supabase.from('daily_progress').select('local_date,xp_total,completed').eq('user_id', user.id).gte('local_date', date7),
                supabase.from('daily_progress').select('completed').eq('user_id', user.id).gte('local_date', weekStartStr).lte('local_date', today),
                supabase.from('daily_progress').select('xp_total,completed').eq('user_id', user.id).gte('local_date', date14).lt('local_date', date7),
            ]);

            const allExpsList = allExps ?? [];
            const allCompsList = allComps ?? [];

            const exps30List = allExpsList.filter((e: any) => e.local_date >= date30);
            const total30 = exps30List.length;
            const evidence30 = exps30List.filter((e: any) => e.trust_label && e.trust_label !== 'self').length;
            const impact30 = exps30List.filter((e: any) => e.impact_signal !== null).length;
            const distinctCats30 = new Set(exps30List.map((e: any) => e.category)).size;

            // 30 day distinct competencies
            const exps30Ids = new Set(exps30List.map((e: any) => e.id));
            const distinctComps = new Set(allCompsList.filter((c: any) => exps30Ids.has(c.experience_id)).map((c: any) => c.competency_key)).size;

            // Career Coaching Stats (All-time)
            const catCounts = allExpsList.reduce<Record<string, number>>((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + 1;
                return acc;
            }, {});
            const topCategories = Object.entries(catCounts)
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            const compCounts = allCompsList.reduce<Record<string, number>>((acc, c) => {
                acc[c.competency_key] = (acc[c.competency_key] || 0) + 1;
                return acc;
            }, {});
            const topCompetencies = Object.entries(compCounts)
                .map(([competencyKey, count]) => ({ competencyKey, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

            const recent7Days = (dp7data ?? []).filter((d: { completed: boolean }) => d.completed).length;
            const recent7XP = (dp7data ?? []).reduce((s: number, d: { xp_total: number }) => s + (d.xp_total ?? 0), 0);
            const prev7Days = (dp7prev ?? []).filter((d: { completed: boolean }) => d.completed).length;
            const prev7XP = (dp7prev ?? []).reduce((s: number, d: { xp_total: number }) => s + (d.xp_total ?? 0), 0);
            const weekCount = (dpWeek ?? []).filter((d: { completed: boolean }) => d.completed).length;
            const weeklyGoal = profile?.weekly_goal ?? 3;
            const xp30 = (dp7data ?? []).reduce((s: number, d: { xp_total: number }) => s + (d.xp_total ?? 0), 0);

            setStats({
                totalRecords30: total30,
                evidenceCount30: evidence30,
                evidenceRatio30: total30 > 0 ? evidence30 / total30 : 0,
                impactSignalCount30: impact30,
                impactRatio30: total30 > 0 ? impact30 / total30 : 0,
                competencyCoverage: distinctComps,
                distinctCategories30: distinctCats30,
                totalXP30: xp30,
                weeklyGoal,
                thisWeekCount: weekCount,
                weeklyAchievementPct: Math.min(100, Math.round((weekCount / weeklyGoal) * 100)),
                recent7Count: recent7Days,
                prev7Count: prev7Days,
                recent7XP,
                prev7XP,
                currentStreak: dailyProgress?.streak_count ?? 0,
                currentGrowthStreak: dailyProgress?.growth_streak_count ?? 0,
                totalRecords: allExpsList.length,
                topCategories,
                topCompetencies,
            });
        } catch (err) { console.error('Stats load error:', err); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-1.5">{[0, 150, 300].map(d => (
                    <div key={d} className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}</div>
            </div>
        );
    }

    if (!stats) return null;
    const insights = calcInsights(stats);

    return (
        <div className="flex-1 overflow-y-auto pb-28">
            {/* Hero */}
            <div className="bg-gradient-to-br from-brand-500 to-indigo-600 px-5 pt-8 pb-8 text-white">
                <h1 className="text-2xl font-extrabold mb-1">내 성장 통계 📈</h1>
                <p className="text-white/70 text-sm">최근 30일 데이터 기준</p>
                <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="bg-white/15 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-extrabold">{stats.totalRecords30}</p>
                        <p className="text-xs text-white/70 mt-0.5">기록 수</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-extrabold">{stats.currentStreak}</p>
                        <p className="text-xs text-white/70 mt-0.5">기록 스트릭 🔥</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 text-center">
                        <p className="text-2xl font-extrabold">{stats.currentGrowthStreak}</p>
                        <p className="text-xs text-white/70 mt-0.5">성장 스트릭 🌿</p>
                    </div>
                </div>
            </div>

            <div className="px-5 py-4 space-y-4">
                {/* 인사이트 */}
                {insights.length > 0 && (
                    <div className="bg-amber-50 rounded-2xl p-4 space-y-2.5 border border-amber-100">
                        <p className="font-bold text-amber-800 text-sm">💡 이번 주 인사이트</p>
                        {insights.map((ins, i) => (
                            <p key={i} className={`text-sm ${ins.type === 'praise' ? 'text-green-700' : 'text-amber-700'}`}>{ins.text}</p>
                        ))}
                    </div>
                )}

                {/* 주간 목표 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-gray-800 text-sm">이번 주 목표 달성</p>
                        <p className="text-xs text-gray-400">{stats.thisWeekCount} / {stats.weeklyGoal}회</p>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-700"
                            style={{ width: `${stats.weeklyAchievementPct}%` }} />
                    </div>
                    <p className="text-right text-xs font-bold text-brand-600 mt-1">{stats.weeklyAchievementPct}%</p>
                </div>

                {/* Evidence + Impact 비율 */}
                <div className="grid grid-cols-2 gap-3">
                    <RatioCard label="증거 포함률" value={stats.evidenceRatio30} count={stats.evidenceCount30} total={stats.totalRecords30} color="blue" icon="🔖" />
                    <RatioCard label="성과 기록률" value={stats.impactRatio30} count={stats.impactSignalCount30} total={stats.totalRecords30} color="orange" icon="📊" />
                </div>

                {/* 역량 커버리지 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="font-bold text-gray-800 text-sm mb-3">역량 커버리지</p>
                    <div className="flex items-end gap-2 mb-3">
                        <p className="text-3xl font-extrabold text-gray-900">{stats.competencyCoverage}</p>
                        <p className="text-sm text-gray-400 pb-1">/ 8 역량</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.values(COMPETENCY_MAP).map(comp => {
                            return (
                                <span key={comp.key} className={`text-xs px-2.5 py-1 rounded-full font-medium ${stats.competencyCoverage > 0 ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {comp.icon} {comp.label}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* 모멘텀 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <p className="font-bold text-gray-800 text-sm mb-3">모멘텀 비교 <span className="text-xs text-gray-400 font-normal">(최근 7일 vs 그 전 7일)</span></p>
                    <div className="grid grid-cols-2 gap-4">
                        <MomentumItem label="기록 수" recent={stats.recent7Count} prev={stats.prev7Count} unit="회" />
                        <MomentumItem label="획득 XP" recent={stats.recent7XP} prev={stats.prev7XP} unit="XP" />
                    </div>
                </div>

                {/* 카테고리 다양성 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-800 text-sm">카테고리 다양성</p>
                        <p className="text-2xl font-extrabold text-indigo-600">{stats.distinctCategories30}종</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">최근 30일 기준 서로 다른 카테고리</p>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.min(100, (stats.distinctCategories30 / 9) * 100)}%` }} />
                    </div>
                </div>

                {/* 커리어 코칭 지표 */}
                {stats.totalRecords >= 5 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><span className="text-brand-500">🎯</span> 나의 강점 분석 (Top 3)</p>
                            <span className="bg-brand-50 text-brand-600 text-[10px] px-2 py-0.5 rounded-full font-bold">진로/코칭</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-400 font-semibold mb-2">집중 카테고리</p>
                                <div className="space-y-2">
                                    {stats.topCategories.map((item, idx) => (
                                        <div key={item.category} className="flex items-center gap-2">
                                            <span className="text-sm font-bold w-4 text-gray-300">{idx + 1}</span>
                                            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-700">{CATEGORIES[item.category]?.icon} {CATEGORIES[item.category]?.label}</span>
                                                <span className="text-xs text-brand-600 font-bold">{item.count}회</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 font-semibold mb-2">발현된 핵심 역량</p>
                                {stats.topCompetencies.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.topCompetencies.map((item, idx) => (
                                            <div key={item.competencyKey} className="flex items-center gap-2">
                                                <span className="text-sm font-bold w-4 text-gray-300">{idx + 1}</span>
                                                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-gray-700">{COMPETENCY_MAP[item.competencyKey]?.icon} {COMPETENCY_MAP[item.competencyKey]?.label}</span>
                                                    <span className="text-xs text-brand-600 font-bold">{item.count}회</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-3 text-center">아직 발견된 역량이 없습니다.</p>
                                )}
                            </div>

                            {/* 페르소나 코칭 결과 */}
                            {stats.topCategories.length > 0 && stats.topCompetencies.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-xs text-brand-500 font-bold mb-2">AI 기반 커리어 페르소나 🤖</p>
                                    <div className="bg-gradient-to-br from-indigo-50 to-brand-50 rounded-xl p-4 border border-indigo-100/50">
                                        {(() => {
                                            const persona = getPersona(
                                                stats.topCategories.map(c => c.category),
                                                stats.topCompetencies.map(c => c.competencyKey)
                                            );
                                            return (
                                                <>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-2xl">{persona.icon}</span>
                                                        <span className="font-extrabold text-gray-900 text-lg">{persona.name}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">"{persona.message}"</p>
                                                    <p className="text-xs text-gray-500 mt-2 mt-3 p-2 bg-white/60 rounded-lg">
                                                        👉 <span className="font-semibold text-indigo-700">{persona.action}</span>
                                                    </p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-4 text-center">
                        <img src="/favicon.svg" alt="Lock" className="w-12 h-12 mx-auto mb-3 opacity-60 grayscale shadow-sm rounded-full bg-white" />
                        <p className="font-bold text-gray-800 text-sm mb-1.5">성과 분석 준비 중</p>
                        <p className="text-xs text-gray-500 leading-relaxed">기록이 5개 이상 쌓이면 커리어 코칭을 위한<br />나만의 강점 분석이 시작됩니다! ({stats.totalRecords}/5)</p>
                        <div className="mt-4 h-1.5 bg-gray-100 rounded-full max-w-[120px] mx-auto overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(stats.totalRecords / 5) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function RatioCard({ label, value, count, total, color, icon }: { label: string; value: number; count: number; total: number; color: 'blue' | 'orange'; icon: string }) {
    const pct = Math.round(value * 100);
    const colorMap = { blue: 'from-blue-400 to-blue-600', orange: 'from-orange-400 to-orange-500' };
    const textMap = { blue: 'text-blue-600', orange: 'text-orange-500' };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-2">{icon} {label}</p>
            <p className={`text-2xl font-extrabold ${textMap[color]} mb-2`}>{pct}%</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{count} / {total}건</p>
        </div>
    );
}

function MomentumItem({ label, recent, prev, unit }: { label: string; recent: number; prev: number; unit: string }) {
    const delta = recent - prev;
    return (
        <div>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-extrabold text-gray-900">{recent}<span className="text-xs text-gray-400 ml-1">{unit}</span></p>
            <div className="flex items-center gap-1 mt-0.5">
                {delta > 0 ? <span className="text-green-500">📈</span> : delta < 0 ? <span className="text-red-400">📉</span> : <span className="text-gray-400">−</span>}
                <span className={`text-xs font-semibold ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {delta > 0 ? `+${delta}` : delta} {unit}
                </span>
            </div>
        </div>
    );
}
