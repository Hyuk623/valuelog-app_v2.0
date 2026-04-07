import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES, Experience, ExperienceAnswer, ExperienceCompetency } from '@/types';
import { AssetTemplates } from '@/lib/templates';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Copy, Check, Sparkles, Files, Briefcase, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ConvertPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // 생성된 결과 관리
    const [generatedOutputs, setGeneratedOutputs] = useState<{ id: string, oneLiner: string, interview: string, portfolio: string }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    useEffect(() => {
        if (user) fetchExperiences();
    }, [user]);

    const fetchExperiences = async () => {
        setLoading(true);
        // 완성도 높은 순으로 가져옴
        const { data } = await supabase.from('experiences')
            .select('*')
            .eq('user_id', user?.id)
            .order('quality_score', { ascending: false })
            .limit(20);
        setExperiences(data || []);
        setLoading(false);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : 
            prev.length < 3 ? [...prev, id] : prev
        );
    };

    const handleGenerate = async () => {
        if (selectedIds.length === 0) return;
        setIsGenerating(true);
        
        try {
            const results = await Promise.all(selectedIds.map(async (id) => {
                const exp = experiences.find(e => e.id === id)!;
                const [{ data: ans }, { data: comp }] = await Promise.all([
                    supabase.from('experience_answers').select('*').eq('experience_id', id),
                    supabase.from('experience_competencies').select('*').eq('experience_id', id)
                ]);

                const context = { 
                    exp, 
                    answers: (ans as ExperienceAnswer[]) || [], 
                    competencies: (comp as ExperienceCompetency[]) || [] 
                };

                return {
                    id,
                    oneLiner: AssetTemplates.generateOneLiner(context),
                    interview: AssetTemplates.generateInterview(context),
                    portfolio: AssetTemplates.generatePortfolio(context)
                };
            }));

            setGeneratedOutputs(results);
        } catch (err) {
            console.error('Generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(key);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (loading) return <div className="flex-1 flex items-center justify-center p-10"><div className="animate-spin text-4xl">💎</div></div>;

    return (
        <div className="flex flex-col min-h-screen bg-surface transition-colors pb-24">
            {/* Header */}
            <div className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-border bg-surface sticky top-0 z-20">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-surface-2">
                    <ChevronLeft size={22} className="text-gray-500" />
                </button>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">기록을 자산으로 ✨</h1>
            </div>

            <div className="px-5 py-6 space-y-8">
                {/* 1. Selection Step */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">기록 선택 (최대 3개)</h2>
                        <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-1 rounded-full">{selectedIds.length}/3 선택됨</span>
                    </div>
                    
                    <div className="space-y-3">
                        {experiences.map(exp => (
                            <button
                                key={exp.id}
                                onClick={() => toggleSelect(exp.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                    selectedIds.includes(exp.id) 
                                    ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-900/10' 
                                    : 'border-border bg-surface-2 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{CATEGORIES[exp.category]?.icon}</span>
                                        <span className="text-xs font-bold text-gray-400">{CATEGORIES[exp.category]?.label}</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                        selectedIds.includes(exp.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                                    }`}>
                                        {selectedIds.includes(exp.id) && <Check size={12} className="text-white" />}
                                    </div>
                                </div>
                                <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{exp.title}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded text-gray-500">완성도 {exp.quality_score}%</span>
                                    <span className="text-[10px] text-gray-400">{exp.local_date}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <Button 
                        fullWidth 
                        className="mt-6 shadow-lg shadow-brand-500/20" 
                        disabled={selectedIds.length === 0 || isGenerating}
                        onClick={handleGenerate}
                        loading={isGenerating}
                    >
                        {isGenerating ? '변환 중...' : '선택한 기록으로 자산 만들기'}
                    </Button>
                </section>

                {/* 2. Output Step */}
                {generatedOutputs.length > 0 && (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="h-px bg-border my-8" />
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Sparkles className="text-brand-500" size={20} /> 활용 예시가 생성되었습니다!
                        </h2>

                        {generatedOutputs.map((out, idx) => {
                            const exp = experiences.find(e => e.id === out.id)!;
                            return (
                                <div key={out.id} className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                                            {idx + 1}
                                        </div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">{exp.title}</h3>
                                    </div>

                                    {/* One-Liner */}
                                    <div className="bg-surface-2 border border-border rounded-2xl p-4 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                                <Files size={14} /> 자기소개 한 줄 초안
                                            </span>
                                            <button 
                                                onClick={() => handleCopy(out.oneLiner, `one-${out.id}`)}
                                                className="text-gray-400 hover:text-brand-500 transition-colors"
                                            >
                                                {copiedIndex === `one-${out.id}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed italic">
                                            {out.oneLiner}
                                        </p>
                                    </div>

                                    {/* Interview */}
                                    <div className="bg-surface-2 border border-border rounded-2xl p-4 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                <Briefcase size={14} /> 면접 답변 초안 (STARR)
                                            </span>
                                            <button 
                                                onClick={() => handleCopy(out.interview, `int-${out.id}`)}
                                                className="text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                                {copiedIndex === `int-${out.id}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/50 dark:bg-black/20 p-3 rounded-xl">
                                            {out.interview}
                                        </div>
                                    </div>

                                    {/* Portfolio Summary */}
                                    <div className="bg-surface-2 border border-border rounded-2xl p-4 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                                                <FileText size={14} /> 포트폴리오 요약 카드
                                            </span>
                                            <button 
                                                onClick={() => handleCopy(out.portfolio, `port-${out.id}`)}
                                                className="text-gray-400 hover:text-orange-500 transition-colors"
                                            >
                                                {copiedIndex === `port-${out.id}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono bg-white/50 dark:bg-black/20 p-3 rounded-xl border-l-4 border-orange-400">
                                            {out.portfolio}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <p className="text-[11px] text-gray-400 text-center pb-10">
                            💡 생성된 문구는 룰 기반으로 조합된 초안입니다. 자신의 말투로 조금씩 다듬어서 사용하세요!
                        </p>
                    </section>
                )}
            </div>
        </div>
    );
}
