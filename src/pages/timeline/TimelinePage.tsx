import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES } from '@/types';
import type { Experience } from '@/types';
import { formatDate } from '@/lib/utils';
import { ChevronRight, Search } from 'lucide-react';

export function TimelinePage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchExperiences = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('experiences')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        setExperiences((data as Experience[]) ?? []);
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchExperiences();
    }, [user]);

    // 필터 및 검색 적용
    const filtered = experiences.filter((exp) => {
        // 1. 카테고리 필터
        if (filter !== 'all' && exp.category !== filter) return false;

        // 2. 검색어 필터 (제목, 요약, 카테고리 이름)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const catLabel = CATEGORIES[exp.category]?.label || '';
            const matchesTitle = exp.title.toLowerCase().includes(query);
            const matchesSummary = exp.summary?.toLowerCase().includes(query);
            const matchesCategory = catLabel.toLowerCase().includes(query);

            if (!matchesTitle && !matchesSummary && !matchesCategory) {
                return false;
            }
        }

        return true;
    });

    // Group by date
    const grouped = filtered.reduce<Record<string, Experience[]>>((acc, exp) => {
        const date = exp.local_date;
        if (!acc[date]) acc[date] = [];
        acc[date]!.push(exp);
        return acc;
    }, {});

    return (
        <div className="flex flex-col min-h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-gray-900">내 기록</h1>
                <p className="text-gray-400 text-sm mt-1">총 {experiences.length}개의 기록</p>

                {/* Search Bar */}
                <div className="mt-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="기록 검색 (제목, 내용, 카테고리)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
                    />
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white px-5 py-3 border-b border-gray-100">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === 'all' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        전체
                    </button>
                    {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${filter === key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            <span>{icon}</span> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-5 py-4">
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-20 rounded-2xl shimmer" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <p className="font-bold text-gray-700 mb-1">
                            {searchQuery ? '검색 결과가 없어요' : '아직 기록이 없어요'}
                        </p>
                        <p className="text-gray-400 text-sm mb-6">
                            {searchQuery ? '다른 검색어를 입력해 보세요.' : '오늘의 퀘스트를 시작해 보세요!'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => navigate('/quest')}
                                className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-semibold"
                            >
                                퀘스트 시작하기
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([date, exps]) => (
                                <div key={date}>
                                    <p className="text-sm font-bold text-gray-400 mb-2 px-1">{formatDate(date)}</p>
                                    <div className="space-y-2">
                                        {exps.map((exp) => {
                                            const cat = CATEGORIES[exp.category] ?? CATEGORIES['daily']!;
                                            return (
                                                <button
                                                    key={exp.id}
                                                    onClick={() => navigate(`/timeline/${exp.id}`)}
                                                    className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 hover:border-brand-200 active:scale-98 transition-all text-left"
                                                >
                                                    <div
                                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                                        style={{ backgroundColor: cat.color + '20' }}
                                                    >
                                                        {cat.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 truncate">{exp.title}</p>
                                                        <p className="text-sm text-gray-400">{cat.label}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-xs font-bold text-xp-600 bg-xp-50 px-2 py-0.5 rounded-full">+{exp.xp_earned}XP</span>
                                                        <ChevronRight size={16} className="text-gray-300" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
