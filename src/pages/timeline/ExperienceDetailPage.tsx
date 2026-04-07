import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES } from '@/types';
import type { Experience, ExperienceAnswer, EvidenceItem, ExperienceCompetency, Skill, ExperienceSkill, ExperienceEditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Trash2, Edit3, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TRUST_LABELS, COMPETENCY_MAP } from '@/lib/competencies';
import { calcQualityScore, getQualityImprovementTips } from '@/lib/quality';

const STEP_LABELS: Record<string, string> = {
    activity: '활동', topic: '주제', task: '업무', goal: '목표', highlight: '하이라이트',
    situation: '상황', feeling: '기분', action: '내가 한 일', result: '결과',
    learned: '배운 점', next: '다음 할 일', achieved: '달성한 것', tomorrow: '내일 할 일',
    what: '무엇을', where: '어디서', takeaway: '얻은 것', who: '누구와',
    process: '과정', taught_others: '공유', looked_back: '돌아봄',
};

export function ExperienceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [experience, setExperience] = useState<Experience | null>(null);
    const [answers, setAnswers] = useState<ExperienceAnswer[]>([]);
    const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
    const [competencies, setCompetencies] = useState<ExperienceCompetency[]>([]);
    const [experienceSkills, setExperienceSkills] = useState<ExperienceSkill[]>([]);
    const [allSkills, setAllSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editLogs, setEditLogs] = useState<ExperienceEditLog[]>([]);
    const [showEditLogModal, setShowEditLogModal] = useState(false);

    // 증빙 URL 추가 인라인
    const [showAddEvidence, setShowAddEvidence] = useState(false);
    const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
    const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
    const [addingEvidence, setAddingEvidence] = useState(false);

    // 스킬 추가 인라인
    const [showAddSkill, setShowAddSkill] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState('');
    const [addingSkill, setAddingSkill] = useState(false);

    // 연관 기록
    const [relatedRecords, setRelatedRecords] = useState<Experience[]>([]);

    const fetchData = async () => {
        if (!id || !user) return;
        setLoading(true);
        const [{ data: exp }, { data: ans }, { data: ev }, { data: comp }, { data: expSkills }, { data: skills }, { data: logs }] = await Promise.all([
            supabase.from('experiences').select('*').eq('id', id).eq('user_id', user.id).single(),
            supabase.from('experience_answers').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('evidence_items').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('experience_competencies').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('experience_skills').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('skills').select('*').eq('is_active', true).order('name_ko'),
            supabase.from('experience_edit_logs').select('*').eq('experience_id', id).order('created_at', { ascending: false })
        ]);
        setExperience(exp as Experience | null);
        setAnswers((ans as ExperienceAnswer[]) ?? []);
        setEvidence((ev as EvidenceItem[]) ?? []);
        setCompetencies((comp as ExperienceCompetency[]) ?? []);
        setExperienceSkills((expSkills as ExperienceSkill[]) ?? []);
        setAllSkills((skills as Skill[]) ?? []);
        setEditLogs((logs as ExperienceEditLog[]) ?? []);
        
        if (exp) {
            const { data: related } = await supabase.from('experiences')
                .select('*')
                .eq('user_id', user.id)
                .eq('category', (exp as Experience).category)
                .neq('id', id)
                .order('created_at', { ascending: false })
                .limit(3);
            setRelatedRecords(related as Experience[] ?? []);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (id && user) fetchData();
    }, [id, user]);

    const handleDelete = async () => {
        if (!id || !user || !experience) return;
        setDeleting(true);
        const expDate = experience.local_date;
        const xpEarned = experience.xp_earned || 20;

        await supabase.from('evidence_items').delete().eq('experience_id', id);
        await supabase.from('experience_competencies').delete().eq('experience_id', id);
        await supabase.from('experience_answers').delete().eq('experience_id', id);
        await supabase.from('experiences').delete().eq('id', id).eq('user_id', user.id);

        // Daily Progress Revert Logic
        const { data: remainingExps } = await supabase.from('experiences').select('id').eq('user_id', user.id).eq('local_date', expDate);
        const { data: currentDp } = await supabase.from('daily_progress').select('*').eq('user_id', user.id).eq('local_date', expDate).single();
        
        if (currentDp) {
            if (!remainingExps || remainingExps.length === 0) {
                const d = new Date(expDate);
                d.setDate(d.getDate() - 1);
                const prevDateStr = d.toISOString().split('T')[0];
                const { data: yDay } = await supabase.from('daily_progress').select('*').eq('user_id', user.id).eq('local_date', prevDateStr).single();
                
                await supabase.from('daily_progress').update({
                    completed: false,
                    xp_total: 0,
                    streak_count: yDay?.completed ? (yDay.streak_count ?? 0) : 0,
                    growth_completed: false,
                    growth_streak_count: yDay?.growth_completed ? (yDay.growth_streak_count ?? 0) : 0,
                    last_completed_date: yDay?.completed ? prevDateStr : null,
                    last_growth_completed_date: yDay?.growth_completed ? prevDateStr : null
                }).eq('id', currentDp.id);
            } else {
                const newXp = Math.max(0, (currentDp.xp_total ?? 0) - xpEarned);
                const hasGrowth = (await supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', user.id).eq('local_date', expDate).neq('trust_label', 'self')).count ?? 0;
                
                const updates: any = { xp_total: newXp };
                if (hasGrowth === 0 && currentDp.growth_completed) {
                   const d = new Date(expDate);
                   d.setDate(d.getDate() - 1);
                   const prevDateStr = d.toISOString().split('T')[0];
                   const { data: yDay } = await supabase.from('daily_progress').select('*').eq('user_id', user.id).eq('local_date', prevDateStr).single();
                   updates.growth_completed = false;
                   updates.growth_streak_count = yDay?.growth_completed ? (yDay.growth_streak_count ?? 0) : 0;
                   updates.last_growth_completed_date = yDay?.growth_completed ? prevDateStr : null;
                }
                
                await supabase.from('daily_progress').update(updates).eq('id', currentDp.id);
            }
        }
        navigate('/timeline', { replace: true });
    };

    const updateQualityInDB = async (newEvidenceCount: number) => {
        if (!experience) return;
        const totalLength = answers.reduce((sum, a) => sum + a.answer.length, 0);
        const newScore = calcQualityScore({
            answerCount: answers.length,
            totalLength,
            imageCount: experience.image_urls?.length || 0,
            evidenceCount: newEvidenceCount,
            hasImpact: !!experience.impact_signal,
            competencyCount: competencies.length
        });
        await supabase.from('experiences').update({ quality_score: newScore }).eq('id', experience.id);
        setExperience(prev => prev ? { ...prev, quality_score: newScore } : null);
    };

    const handleAddEvidence = async () => {
        if (!id || !newEvidenceUrl.startsWith('http')) return;
        setAddingEvidence(true);
        const { data } = await supabase.from('evidence_items').insert({
            experience_id: id, type: 'url', url: newEvidenceUrl, title: newEvidenceTitle || null,
        }).select().single();
        if (data) {
            const newCount = evidence.length + 1;
            setEvidence(prev => [...prev, data as EvidenceItem]);
            await updateQualityInDB(newCount);
        }
        setNewEvidenceUrl('');
        setNewEvidenceTitle('');
        setShowAddEvidence(false);
        setAddingEvidence(false);
    };

    const handleDeleteEvidence = async (evId: string) => {
        await supabase.from('evidence_items').delete().eq('id', evId);
        const newCount = evidence.length - 1;
        setEvidence(prev => prev.filter(e => e.id !== evId));
        await updateQualityInDB(newCount);
    };

    const handleAddSkill = async () => {
        if (!id || !selectedSkill) return;
        setAddingSkill(true);
        const { data } = await supabase.from('experience_skills').insert({
            experience_id: id, skill_key: selectedSkill
        }).select().single();
        if (data) setExperienceSkills(prev => [...prev, data as ExperienceSkill]);
        setSelectedSkill('');
        setShowAddSkill(false);
        setAddingSkill(false);
    };

    const handleDeleteSkill = async (esId: string) => {
        await supabase.from('experience_skills').delete().eq('id', esId);
        setExperienceSkills(prev => prev.filter(s => s.id !== esId));
    };

    if (loading) {
        return (<div className="flex-1 flex items-center justify-center"><div className="text-4xl animate-pulse">📖</div></div>);
    }
    if (!experience) {
        return (<div className="flex-1 flex items-center justify-center px-5 text-center"><p className="text-gray-400">기록을 찾을 수 없어요.</p></div>);
    }

    const cat = CATEGORIES[experience.category] ?? CATEGORIES['daily']!;
    const trustInfo = TRUST_LABELS[experience.trust_label ?? 'self']!;

    return (
        <div className="flex flex-col min-h-screen bg-surface transition-colors duration-300">
            {/* Header */}
            <div className="px-5 pt-12 pb-4 flex items-center justify-between border-b border-border transition-colors">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-2 transition-colors">
                    <ChevronLeft size={22} className="text-gray-500 dark:text-gray-400" />
                </button>
                <div className="flex gap-2">
                    <button onClick={() => navigate(`/timeline/${id}/edit`)} className="p-2 rounded-xl hover:bg-surface-2 transition-colors">
                        <Edit3 size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={20} className="text-red-400" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-5 py-6 space-y-6 overflow-y-auto pb-28">
                {/* Category + Title */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: cat.color + '20' }}>
                            {cat.icon}
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{cat.label}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">{experience.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-sm text-gray-400 dark:text-gray-500 transition-colors">{formatDateTime(experience.created_at)}</p>
                        {editLogs.length > 0 && (
                            <button onClick={() => setShowEditLogModal(true)} className="text-[10px] font-bold bg-surface-2 border border-border text-gray-500 px-2 py-0.5 rounded-md hover:bg-surface-3 transition-colors">
                                {editLogs.length}회 수정됨 🔍
                            </button>
                        )}
                    </div>
                </div>

                {/* XP + Trust + Growth row */}
                <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 bg-xp-50 dark:bg-xp-950/20 px-4 py-2 rounded-full transition-colors">
                        <span className="text-xp-500">⭐</span>
                        <span className="font-bold text-xp-600 dark:text-xp-400 text-sm">+{experience.xp_earned} XP</span>
                    </div>
                    {experience.growth_index && (
                        <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100">
                            <span className="text-green-500">🌿</span>
                            <span className="font-bold text-green-600 text-sm">성장 L{experience.growth_index.toFixed(1)}</span>
                        </div>
                    )}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${trustInfo.bg}`}>
                        <span>{trustInfo.icon}</span>
                        <span className={`text-sm font-bold ${trustInfo.color}`}>{trustInfo.label}</span>
                        {experience.trust_score > 0 && (
                            <span className={`text-xs ${trustInfo.color} opacity-70`}>{experience.trust_score}점</span>
                        )}
                    </div>
                </div>

                {/* Quality Score & Tips */}
                {(() => {
                    const totalLength = answers.reduce((sum, a) => sum + a.answer.length, 0);
                    const qParams = {
                        answerCount: answers.length,
                        totalLength,
                        imageCount: experience.image_urls?.length || 0,
                        evidenceCount: evidence.length,
                        hasImpact: !!experience.impact_signal,
                        competencyCount: competencies.length
                    };
                    const tips = getQualityImprovementTips(qParams);
                    
                    return (
                        <div className="bg-surface-2 rounded-2xl p-4 border border-border shadow-sm transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">💎 기록 완성도</span>
                                <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400">{experience.quality_score}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-brand-500 transition-all duration-500 rounded-full" style={{ width: `${experience.quality_score}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-500 mb-2">기록 내용 {totalLength}자 | 답변 {answers.length}개</p>
                            {tips.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    {tips.map((tip, i) => (
                                        <p key={i} className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                            <span className="flex-shrink-0">✨</span> <span>{tip}</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Impact Signal */}
                {experience.impact_signal && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl p-4 border border-orange-100 dark:border-orange-900/40 transition-colors">
                        <p className="text-xs font-bold text-orange-400 uppercase mb-1">
                            {experience.impact_signal.type === 'metric' ? '📈 수치/지표' : experience.impact_signal.type === 'feedback' ? '💬 피드백' : '📄 결과물'}
                        </p>
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed transition-colors">{experience.impact_signal.value}</p>
                    </div>
                )}

                {/* Image Gallery */}
                {experience.image_urls?.length > 0 && (
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 transition-colors">📸 활동 사진</h2>
                        <div className="flex flex-wrap gap-2">
                            {experience.image_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden border border-border dark:border-gray-800 shadow-sm">
                                    <img src={url} alt={`활동 사진 ${i + 1}`} className="w-36 h-36 object-cover hover:opacity-90 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Evidence Items */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 transition-colors">🔗 증빙 링크</h2>
                        {evidence.length < 3 && (
                            <button onClick={() => setShowAddEvidence(s => !s)} className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
                                <Plus size={14} />추가
                            </button>
                        )}
                    </div>
                    {showAddEvidence && (
                        <div className="space-y-2 mb-3 bg-surface-2 rounded-2xl p-3 border border-border transition-colors">
                            <input value={newEvidenceUrl} onChange={e => setNewEvidenceUrl(e.target.value)}
                                placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-400 dark:text-gray-100" />
                            <input value={newEvidenceTitle} onChange={e => setNewEvidenceTitle(e.target.value)}
                                placeholder="제목 (선택)" className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-400 dark:text-gray-100" />
                            <div className="flex gap-2">
                                <Button size="sm" loading={addingEvidence} onClick={handleAddEvidence} disabled={!newEvidenceUrl.startsWith('http')}>저장</Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowAddEvidence(false)}>취소</Button>
                            </div>
                        </div>
                    )}
                    {evidence.length > 0 ? (
                        <div className="space-y-2">
                            {evidence.map(ev => (
                                <div key={ev.id} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/20 rounded-2xl px-4 py-3 border border-blue-100/50 dark:border-blue-900/40 transition-colors">
                                    <span className="text-blue-400 flex-shrink-0">🔗</span>
                                    <div className="flex-1 min-w-0">
                                        <a href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-sm hover:underline truncate transition-colors">
                                            {ev.title || new URL(ev.url).hostname}
                                            <ExternalLink size={12} />
                                        </a>
                                        {ev.title && <p className="text-xs text-blue-400 truncate opacity-80">{ev.url}</p>}
                                    </div>
                                    <button onClick={() => handleDeleteEvidence(ev.id)} className="text-red-300 hover:text-red-500 p-1 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors">증빙 링크가 없어요. 추가 버튼으로 링크를 붙여넣어보세요!</p>
                    )}
                </div>

                {/* Competencies */}
                {competencies.length > 0 && (
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 transition-colors">💡 역량 기록</h2>
                        <div className="space-y-2">
                            {competencies.map(comp => {
                                const def = COMPETENCY_MAP[comp.competency_key];
                                return (
                                    <div key={comp.id} className="bg-brand-50 dark:bg-brand-950/20 rounded-2xl px-4 py-3 border border-brand-100 dark:border-brand-900/40 transition-colors">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{def?.icon ?? '💡'}</span>
                                            <span className="font-bold text-brand-700 dark:text-brand-400 text-sm">{def?.label ?? comp.competency_key}</span>
                                            <span className="ml-auto text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">Lv.{comp.level}</span>
                                        </div>
                                        <p className="text-sm text-brand-600 dark:text-brand-300 font-medium">{comp.anchor_text}</p>
                                        <p className="text-xs text-brand-400 dark:text-brand-500 mt-0.5">{comp.checked_count} / {comp.checklist_snapshot?.length ?? 5}개 체크</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Answers */}
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-800 dark:text-gray-200 transition-colors">기록 내용</h2>
                    {answers.length > 0 ? (
                        answers.map((ans) => (
                            <div key={ans.id} className="bg-surface-2 rounded-2xl p-4 border border-border transition-colors">
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 transition-colors">
                                    {STEP_LABELS[ans.step_key] ?? ans.step_key}
                                </p>
                                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap transition-colors">{ans.answer}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors">저장된 답변이 없어요.</p>
                    )}
                </div>

                {/* Skills */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 transition-colors">🛠️ 스킬 태그</h2>
                        {!showAddSkill && (
                            <button onClick={() => setShowAddSkill(true)} className="flex items-center gap-1 text-xs text-brand-500 font-semibold transition-colors">
                                <Plus size={14} />추가
                            </button>
                        )}
                    </div>
                    {showAddSkill && (
                        <div className="space-y-2 mb-3 bg-surface-2 rounded-2xl p-3 border border-border transition-colors">
                            <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-brand-400 bg-surface dark:text-gray-100 transition-colors">
                                <option value="">스킬 선택...</option>
                                {allSkills.filter(s => !experienceSkills.find(es => es.skill_key === s.key)).map(s => (
                                    <option key={s.key} value={s.key}>{s.name_ko}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <Button size="sm" loading={addingSkill} onClick={handleAddSkill} disabled={!selectedSkill}>저장</Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowAddSkill(false)}>취소</Button>
                            </div>
                        </div>
                    )}
                    {experienceSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {experienceSkills.map(es => {
                                const skillInfo = allSkills.find(s => s.key === es.skill_key);
                                return (
                                    <div key={es.id} className="inline-flex items-center gap-1.5 bg-surface-3 px-3 py-1.5 rounded-full border border-border transition-colors">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{skillInfo?.name_ko ?? es.skill_key}</span>
                                        <button onClick={() => handleDeleteSkill(es.id)} className="text-red-400 hover:text-red-600 p-0.5 transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors">등록된 스킬이 없어요. 사용한 기술이나 도구가 있다면 태그해보세요!</p>
                    )}
                </div>

                {/* Related Records */}
                {relatedRecords.length > 0 && (
                    <div className="pt-6 border-t border-border mt-8">
                        <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-3 transition-colors">같은 분야의 다른 경험들 👀</h2>
                        <div className="space-y-2">
                            {relatedRecords.map(rel => (
                                <button
                                    key={rel.id}
                                    onClick={() => navigate(`/timeline/${rel.id}`)}
                                    className="w-full flex items-center justify-between bg-surface-2 hover:bg-surface-3 border border-border p-3 rounded-xl transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-sm flex-shrink-0">
                                            {CATEGORIES[rel.category]?.icon ?? '✨'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{rel.title}</p>
                                            <p className="text-xs text-gray-500">{rel.local_date}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-end animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="w-full max-w-[480px] mx-auto bg-surface rounded-t-3xl p-6 animate-slide-up transition-colors pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">기록을 삭제할까요?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">삭제된 기록은 복구할 수 없어요.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                            <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete}>삭제하기</Button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Edit Logs Modal */}
            {showEditLogModal && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in px-4" style={{ zIndex: 9999 }}>
                    <div className="w-full max-w-lg bg-surface rounded-3xl p-6 shadow-xl animate-slide-up max-h-[85vh] flex flex-col transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">수정 내역 (Audit Log)</h3>
                            <button onClick={() => setShowEditLogModal(false)} className="p-1 rounded-full hover:bg-surface-2 transition-colors">
                                <span className="text-gray-400 font-extrabold text-lg">✕</span>
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">조회자들의 데이터 신뢰성 검증을 위해, 본 내용이 수정되기 이전의 과거 스냅샷들이 안전하게 보관되어 있습니다.</p>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {editLogs.map((log, idx) => (
                                <div key={log.id} className="bg-surface-2 p-4 rounded-2xl border border-border transition-colors">
                                    <p className="text-xs font-bold text-brand-500 mb-2">버전 #{editLogs.length - idx} &middot; {formatDateTime(log.created_at)}</p>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm">{log.snapshot.title}</h4>
                                    <div className="space-y-3">
                                        {log.snapshot.answers?.map((ans: any, i: number) => (
                                            <div key={i}>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{STEP_LABELS[ans.step_key] ?? ans.step_key}</p>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ans.answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button fullWidth onClick={() => setShowEditLogModal(false)} className="mt-4 flex-shrink-0">닫기</Button>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
