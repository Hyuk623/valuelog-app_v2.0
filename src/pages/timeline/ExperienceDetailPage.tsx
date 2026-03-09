import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES } from '@/types';
import type { Experience, ExperienceAnswer, EvidenceItem, ExperienceCompetency, Skill, ExperienceSkill } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { ChevronLeft, Trash2, Edit3, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TRUST_LABELS, COMPETENCY_MAP } from '@/lib/competencies';

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

    // 증빙 URL 추가 인라인
    const [showAddEvidence, setShowAddEvidence] = useState(false);
    const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
    const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
    const [addingEvidence, setAddingEvidence] = useState(false);

    // 스킬 추가 인라인
    const [showAddSkill, setShowAddSkill] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState('');
    const [addingSkill, setAddingSkill] = useState(false);

    const fetchData = async () => {
        if (!id || !user) return;
        setLoading(true);
        const [{ data: exp }, { data: ans }, { data: ev }, { data: comp }, { data: expSkills }, { data: skills }] = await Promise.all([
            supabase.from('experiences').select('*').eq('id', id).eq('user_id', user.id).single(),
            supabase.from('experience_answers').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('evidence_items').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('experience_competencies').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('experience_skills').select('*').eq('experience_id', id).order('created_at'),
            supabase.from('skills').select('*').eq('is_active', true).order('name_ko')
        ]);
        setExperience(exp as Experience | null);
        setAnswers((ans as ExperienceAnswer[]) ?? []);
        setEvidence((ev as EvidenceItem[]) ?? []);
        setCompetencies((comp as ExperienceCompetency[]) ?? []);
        setExperienceSkills((expSkills as ExperienceSkill[]) ?? []);
        setAllSkills((skills as Skill[]) ?? []);
        setLoading(false);
    };

    useEffect(() => {
        if (id && user) fetchData();
    }, [id, user]);

    const handleDelete = async () => {
        if (!id || !user) return;
        setDeleting(true);
        await supabase.from('evidence_items').delete().eq('experience_id', id);
        await supabase.from('experience_competencies').delete().eq('experience_id', id);
        await supabase.from('experience_answers').delete().eq('experience_id', id);
        await supabase.from('experiences').delete().eq('id', id).eq('user_id', user.id);
        navigate('/timeline', { replace: true });
    };

    const handleAddEvidence = async () => {
        if (!id || !newEvidenceUrl.startsWith('http')) return;
        setAddingEvidence(true);
        const { data } = await supabase.from('evidence_items').insert({
            experience_id: id, type: 'url', url: newEvidenceUrl, title: newEvidenceTitle || null,
        }).select().single();
        if (data) setEvidence(prev => [...prev, data as EvidenceItem]);
        setNewEvidenceUrl('');
        setNewEvidenceTitle('');
        setShowAddEvidence(false);
        setAddingEvidence(false);
    };

    const handleDeleteEvidence = async (evId: string) => {
        await supabase.from('evidence_items').delete().eq('id', evId);
        setEvidence(prev => prev.filter(e => e.id !== evId));
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
        <div className="flex flex-col min-h-screen bg-white">
            {/* Header */}
            <div className="px-5 pt-12 pb-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100">
                    <ChevronLeft size={22} className="text-gray-500" />
                </button>
                <div className="flex gap-2">
                    <button onClick={() => navigate(`/timeline/${id}/edit`)} className="p-2 rounded-xl hover:bg-gray-100">
                        <Edit3 size={20} className="text-gray-500" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl hover:bg-red-50">
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
                        <span className="text-sm font-bold text-gray-500">{cat.label}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900">{experience.title}</h1>
                    <p className="text-sm text-gray-400 mt-1">{formatDateTime(experience.created_at)}</p>
                </div>

                {/* XP + Trust + Growth row */}
                <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 bg-xp-50 px-4 py-2 rounded-full">
                        <span className="text-xp-500">⭐</span>
                        <span className="font-bold text-xp-600 text-sm">+{experience.xp_earned} XP</span>
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

                {/* Impact Signal */}
                {experience.impact_signal && (
                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                        <p className="text-xs font-bold text-orange-400 uppercase mb-1">
                            {experience.impact_signal.type === 'metric' ? '📈 수치/지표' : experience.impact_signal.type === 'feedback' ? '💬 피드백' : '📄 결과물'}
                        </p>
                        <p className="text-sm text-orange-800 leading-relaxed">{experience.impact_signal.value}</p>
                    </div>
                )}

                {/* Image Gallery */}
                {experience.image_urls?.length > 0 && (
                    <div>
                        <h2 className="font-bold text-gray-800 mb-3">📸 활동 사진</h2>
                        <div className="flex flex-wrap gap-2">
                            {experience.image_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <img src={url} alt={`활동 사진 ${i + 1}`} className="w-36 h-36 object-cover hover:opacity-90 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Evidence Items */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-gray-800">🔗 증빙 링크</h2>
                        {evidence.length < 3 && (
                            <button onClick={() => setShowAddEvidence(s => !s)} className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
                                <Plus size={14} />추가
                            </button>
                        )}
                    </div>
                    {showAddEvidence && (
                        <div className="space-y-2 mb-3 bg-gray-50 rounded-2xl p-3">
                            <input value={newEvidenceUrl} onChange={e => setNewEvidenceUrl(e.target.value)}
                                placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-400" />
                            <input value={newEvidenceTitle} onChange={e => setNewEvidenceTitle(e.target.value)}
                                placeholder="제목 (선택)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-400" />
                            <div className="flex gap-2">
                                <Button size="sm" loading={addingEvidence} onClick={handleAddEvidence} disabled={!newEvidenceUrl.startsWith('http')}>저장</Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowAddEvidence(false)}>취소</Button>
                            </div>
                        </div>
                    )}
                    {evidence.length > 0 ? (
                        <div className="space-y-2">
                            {evidence.map(ev => (
                                <div key={ev.id} className="flex items-center gap-3 bg-blue-50 rounded-2xl px-4 py-3">
                                    <span className="text-blue-400 flex-shrink-0">🔗</span>
                                    <div className="flex-1 min-w-0">
                                        <a href={ev.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-blue-600 text-sm hover:underline truncate">
                                            {ev.title || new URL(ev.url).hostname}
                                            <ExternalLink size={12} />
                                        </a>
                                        {ev.title && <p className="text-xs text-blue-400 truncate">{ev.url}</p>}
                                    </div>
                                    <button onClick={() => handleDeleteEvidence(ev.id)} className="text-red-300 hover:text-red-500 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">증빙 링크가 없어요. 추가 버튼으로 링크를 붙여넣어보세요!</p>
                    )}
                </div>

                {/* Competencies */}
                {competencies.length > 0 && (
                    <div>
                        <h2 className="font-bold text-gray-800 mb-3">💡 역량 기록</h2>
                        <div className="space-y-2">
                            {competencies.map(comp => {
                                const def = COMPETENCY_MAP[comp.competency_key];
                                return (
                                    <div key={comp.id} className="bg-brand-50 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{def?.icon ?? '💡'}</span>
                                            <span className="font-bold text-brand-700 text-sm">{def?.label ?? comp.competency_key}</span>
                                            <span className="ml-auto text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">Lv.{comp.level}</span>
                                        </div>
                                        <p className="text-sm text-brand-600 font-medium">{comp.anchor_text}</p>
                                        <p className="text-xs text-brand-400 mt-0.5">{comp.checked_count} / {comp.checklist_snapshot?.length ?? 5}개 체크</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Answers */}
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-800">기록 내용</h2>
                    {answers.length > 0 ? (
                        answers.map((ans) => (
                            <div key={ans.id} className="bg-gray-50 rounded-2xl p-4">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                                    {STEP_LABELS[ans.step_key] ?? ans.step_key}
                                </p>
                                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{ans.answer}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-sm">저장된 답변이 없어요.</p>
                    )}
                </div>

                {/* Skills */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-gray-800">🛠️ 스킬 태그</h2>
                        {!showAddSkill && (
                            <button onClick={() => setShowAddSkill(true)} className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
                                <Plus size={14} />추가
                            </button>
                        )}
                    </div>
                    {showAddSkill && (
                        <div className="space-y-2 mb-3 bg-gray-50 rounded-2xl p-3">
                            <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-400 bg-white">
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
                                    <div key={es.id} className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                                        <span className="text-sm font-medium text-gray-700">{skillInfo?.name_ko ?? es.skill_key}</span>
                                        <button onClick={() => handleDeleteSkill(es.id)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={12} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">등록된 스킬이 없어요. 사용한 기술이나 도구가 있다면 태그해보세요!</p>
                    )}
                </div>
            </div>

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
                    <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl p-6 animate-slide-up">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">기록을 삭제할까요?</h3>
                        <p className="text-gray-500 text-sm mb-6">삭제된 기록은 복구할 수 없어요.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                            <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete}>삭제하기</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
