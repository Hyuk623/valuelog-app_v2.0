import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES, Experience, ExperienceAnswer, ExperienceCompetency } from '@/types';
import { AssetTemplates } from '@/lib/templates';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Copy, Check, Sparkles, Files, Briefcase, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConvertPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // 생성된 결과 관리 (편집 가능)
    const [generatedOutputs, setGeneratedOutputs] = useState<{ 
        id: string, 
        oneLiner: string, 
        interview: string, 
        portfolio: string,
        careerDesc: string 
    }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (user) fetchExperiences();
    }, [user]);

    const fetchExperiences = async () => {
        setLoading(true);
        const { data } = await supabase.from('experiences')
            .select('*')
            .eq('user_id', user?.id)
            .order('quality_score', { ascending: false })
            .limit(30);
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
                    portfolio: AssetTemplates.generatePortfolio(context),
                    careerDesc: AssetTemplates.generateCareerDescription(context)
                };
            }));

            setGeneratedOutputs(results);
            setShowModal(true);
        } catch (err) {
            console.error('Generation error:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateOutput = (id: string, field: string, value: string) => {
        setGeneratedOutputs(prev => prev.map(out => 
            out.id === id ? { ...out, [field]: value } : out
        ));
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(key);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (loading) return <div className="flex-1 flex items-center justify-center p-10"><div className="animate-spin text-4xl">💎</div></div>;

    return (
        <div className="flex flex-col min-h-screen bg-surface-2 transition-colors pb-32">
            {/* Header */}
            <div className="px-5 pt-12 pb-5 flex items-center gap-3 border-b border-border bg-surface sticky top-0 z-20 transition-colors">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-surface-2">
                    <ChevronLeft size={22} className="text-gray-500" />
                </button>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">기록을 자산으로 ✨</h1>
            </div>

            <div className="px-5 py-6">
                {/* Intro */}
                <div className="mb-6 space-y-1">
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400">자산 전환</p>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">변환할 기록을 선택하세요</h2>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">작성된 기록을 바탕으로 취업이나 포트폴리오에 <br />즉시 활용 가능한 문장을 만들어 드려요. (최대 3개)</p>
                </div>

                {/* 1. Selection Step */}
                <div className="space-y-3">
                    {experiences.map(exp => (
                        <button
                            key={exp.id}
                            onClick={() => toggleSelect(exp.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                                selectedIds.includes(exp.id) 
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10 shadow-md ring-2 ring-brand-500/10' 
                                : 'border-border bg-surface hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{CATEGORIES[exp.category]?.icon}</span>
                                    <span className="text-xs font-bold text-gray-400">{CATEGORIES[exp.category]?.label}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    selectedIds.includes(exp.id) ? 'bg-brand-500 border-brand-500' : 'border-gray-200 dark:border-gray-700'
                                }`}>
                                    {selectedIds.includes(exp.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                            </div>
                            <p className="font-extrabold text-gray-900 dark:text-gray-100 truncate transition-colors">{exp.title}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    exp.quality_score >= 80 ? 'bg-green-50 text-green-600' :
                                    exp.quality_score >= 50 ? 'bg-blue-50 text-blue-600' :
                                    'bg-gray-50 text-gray-500'
                                }`}>활용도 {exp.quality_score}%</span>
                                <span className="text-[10px] text-gray-400 font-medium">{exp.local_date}</span>
                            </div>
                        </button>
                    ))}

                    {experiences.length === 0 && (
                        <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border px-10">
                            <p className="text-gray-300 dark:text-gray-600 mb-4 text-3xl">📭</p>
                            <p className="text-gray-400 text-sm font-medium">변환할 수 있는 기록이 아직 없어요.<br />먼저 오늘을 기록해볼까요?</p>
                            <Button className="mt-6" variant="secondary" onClick={() => navigate('/quest')}>활동 기록하기</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Sticky Action Button */}
            {experiences.length > 0 && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-6 z-40 animate-slide-up">
                    <div className={cn(
                        "p-1.5 rounded-[24px] transition-all duration-500 shadow-2xl",
                        selectedIds.length > 0 
                            ? "bg-brand-500/90 backdrop-blur-md scale-100 opacity-100" 
                            : "bg-gray-200/50 backdrop-blur-sm scale-95 opacity-80 pointer-events-none"
                    )}>
                        <Button 
                            fullWidth 
                            size="lg"
                            className={cn(
                                "h-14 rounded-[18px] font-black text-base transition-all duration-300 relative overflow-hidden active:scale-95",
                                selectedIds.length > 0 
                                    ? "bg-white text-brand-600 shadow-none border-none" 
                                    : "bg-transparent text-gray-400 border-none"
                            )} 
                            disabled={selectedIds.length === 0 || isGenerating}
                            onClick={handleGenerate}
                            loading={isGenerating}
                        >
                            <div className="flex items-center justify-center gap-3">
                                {isGenerating ? (
                                    <Sparkles size={20} className="animate-spin" />
                                ) : (
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all",
                                        selectedIds.length > 0 ? "bg-brand-600 text-white" : "bg-gray-300 text-white"
                                    )}>
                                        {selectedIds.length}
                                    </div>
                                )}
                                <span className={cn(
                                    "tracking-tight",
                                    selectedIds.length > 0 ? "" : "opacity-70"
                                )}>
                                    {selectedIds.length > 0 
                                        ? `${selectedIds.length}개의 기록으로 자산 만들기` 
                                        : '변환할 기록을 선택하세요'}
                                </span>
                            </div>
                        </Button>
                    </div>
                </div>
            )}

            {/* 2. Output Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end animate-fade-in z-[100]">
                    <div className="w-full max-w-[480px] mx-auto bg-surface rounded-t-[32px] h-[92vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden transition-colors">
                        {/* Modal Header */}
                        <div className="px-6 pt-8 pb-4 flex items-center justify-between border-b border-border bg-surface transition-colors shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles className="text-brand-500" size={24} />
                                <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">나만의 자산 패키지</h2>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-12">
                            <div className="text-center space-y-2">
                                <p className="text-[13px] text-gray-400 font-medium leading-relaxed">
                                    생성된 내용을 직접 터치하여 수정해보세요.<br />
                                    수정된 내용은 복사 시 그대로 적용됩니다!
                                </p>
                            </div>

                            {generatedOutputs.map((out, idx) => {
                                const exp = experiences.find(e => e.id === out.id)!;
                                return (
                                    <div key={out.id} className="space-y-6">
                                        <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-900/10 p-3 rounded-2xl border border-brand-100 dark:border-brand-900/30">
                                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-extrabold">
                                                {idx + 1}
                                            </div>
                                            <h3 className="font-bold text-brand-700 dark:text-brand-300 text-sm truncate">{exp.title}</h3>
                                        </div>

                                        <AssetBlock 
                                            icon={<Files size={14} />}
                                            title="자기소개 요약 초안"
                                            colorClass="text-brand-600 dark:text-brand-400"
                                            value={out.oneLiner}
                                            onChange={(val) => handleUpdateOutput(out.id, 'oneLiner', val)}
                                            onCopy={() => handleCopy(out.oneLiner, `one-${out.id}`)}
                                            isCopied={copiedIndex === `one-${out.id}`}
                                        />

                                        <AssetBlock 
                                            icon={<FileText size={14} />}
                                            title="경력기술형 설명"
                                            colorClass="text-emerald-600 dark:text-emerald-400"
                                            value={out.careerDesc}
                                            onChange={(val) => handleUpdateOutput(out.id, 'careerDesc', val)}
                                            onCopy={() => handleCopy(out.careerDesc, `career-${out.id}`)}
                                            isCopied={copiedIndex === `career-${out.id}`}
                                        />

                                        <AssetBlock 
                                            icon={<Briefcase size={14} />}
                                            title="면접 답변 초안"
                                            colorClass="text-blue-600 dark:text-blue-400"
                                            value={out.interview}
                                            onChange={(val) => handleUpdateOutput(out.id, 'interview', val)}
                                            onCopy={() => handleCopy(out.interview, `int-${out.id}`)}
                                            isCopied={copiedIndex === `int-${out.id}`}
                                            isMultiline
                                        />

                                        <AssetBlock 
                                            icon={<Files size={14} />}
                                            title="포트폴리오 카드 텍스트"
                                            colorClass="text-orange-600 dark:text-orange-400"
                                            value={out.portfolio}
                                            onChange={(val) => handleUpdateOutput(out.id, 'portfolio', val)}
                                            onCopy={() => handleCopy(out.portfolio, `port-${out.id}`)}
                                            isCopied={copiedIndex === `port-${out.id}`}
                                            isMultiline
                                        />
                                    </div>
                                );
                            })}
                            
                            <div className="pb-20 text-center">
                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                    💡 룰 기반 변환 엔진(v5.1)을 사용하여 안전하게 생성되었습니다. <br />
                                    외부 AI API로 데이터가 전송되지 않습니다.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 bg-surface border-t border-border transition-colors pb-10">
                            <Button fullWidth size="lg" onClick={() => setShowModal(false)} variant="secondary">닫기</Button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}

function AssetBlock({ icon, title, value, colorClass, onChange, onCopy, isCopied, isMultiline }: {
    icon: React.ReactNode;
    title: string;
    value: string;
    colorClass: string;
    onChange: (val: string) => void;
    onCopy: () => void;
    isCopied: boolean;
    isMultiline?: boolean;
}) {
    return (
        <div className="bg-surface border border-border rounded-2xl p-4 transition-all focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/30">
            <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-[10px] font-extrabold flex items-center gap-1.5 uppercase tracking-wider ${colorClass}`}>
                    {icon} {title}
                </span>
                <button 
                    onClick={onCopy}
                    className="p-1.5 px-2.5 rounded-lg bg-surface-2 dark:bg-gray-800 border border-border text-gray-400 hover:text-brand-500 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                    {isCopied ? <><Check size={14} className="text-green-500" /><span className="text-[10px] font-bold text-green-500">복사됨</span></> : <><Copy size={13} /><span className="text-[10px] font-bold">복사</span></>}
                </button>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-surface-2 dark:bg-black/20 text-sm text-gray-800 dark:text-gray-200 leading-relaxed p-4 rounded-xl focus:outline-none transition-all border border-transparent focus:border-brand-200 dark:focus:border-brand-900/50 resize-none ${isMultiline ? 'h-36' : 'h-18'}`}
                placeholder="내용을 입력하세요..."
            />
        </div>
    );
}
