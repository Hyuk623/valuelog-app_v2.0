import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES, XP_PER_QUEST, getLocalDateKST } from '@/types';
import type { PromptSet, PromptStep, QuestAnswer, NewlyEarnedBadge, ExperienceCompetency } from '@/types';
import { COMPETENCIES, calcCompetencyLevel, calcTrust, calcXPBonus, TRUST_LABELS } from '@/lib/competencies';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, X, ImagePlus, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

// ===================== Built-in Prompts =====================
const BUILTIN_PROMPTS: Record<string, PromptStep[]> = {
    exercise: [
        { key: 'activity', question: '오늘 어떤 운동을 했나요?', placeholder: '예: 달리기 30분, 헬스 상체', examples: ['달리기', '헬스', '수영', '요가', '자전거', '등산', '홈트'], required: true, order: 0 },
        { key: 'situation', question: '운동 전 몸 상태나 마음가짐은?', placeholder: '피곤했나요? 신났나요?', guide: '💡 하기 싫어도 나간 것 자체가 대단해요!', examples: ['피곤했지만 억지로', '컨디션 좋아서', '스트레스 해소하려고', '루틴이라 그냥'], required: true, order: 1 },
        { key: 'result', question: '운동 결과나 성과는?', placeholder: '거리, 시간, 횟수 등', examples: ['5km 완주!', '3세트 완료', '개인 최고기록', '30분 채움'], required: true, order: 2 },
        { key: 'learned', question: '오늘 느낀 점은? (선택)', placeholder: '깨달음, 다음엔 바꿀 것', guide: '💡 작은 발견도 훌륭해요!', examples: ['꾸준함이 최고', '워밍업 필수', '다음엔 강도 올릴 것'], required: false, order: 3 },
    ],
    study: [
        { key: 'topic', question: '오늘 무엇을 공부/읽었나요?', placeholder: '예: 영어 단어 50개', examples: ['영어', '수학', '독서', '강의', '자격증', '코딩'], required: true, order: 0 },
        { key: 'situation', question: '공부한 계기나 목적은?', placeholder: '왜 오늘 이것을?', guide: '💡 "그냥 하고 싶어서"도 OK!', examples: ['시험 대비', '업무 필요', '취미로', '목표를 위해'], required: true, order: 1 },
        { key: 'result', question: '오늘 달성한 것은?', placeholder: '얼마나? 무엇을 완료?', examples: ['2시간 집중', '챕터 완독', '문제 20개', '강의 2개'], required: true, order: 2 },
        { key: 'learned', question: '가장 기억에 남는 내용은? (선택)', placeholder: '새로 알게 된 것', guide: '💡 한 가지만도 OK!', examples: ['이 개념이 신기했어요', '잘못 알던 걸 바로잡음', '실제로 써볼 수 있을 것'], required: false, order: 3 },
    ],
    experience: [
        { key: 'what', question: '어떤 견학/체험을 했나요?', placeholder: '예: 박물관, 도예 체험, 여행', examples: ['박물관', '공장 견학', '농장 체험', '요리 체험', '여행', '전시회', '테마파크'], required: true, order: 0 },
        { key: 'where', question: '어디서, 누구와 함께였나요?', placeholder: '장소, 동행인', examples: ['혼자', '가족과', '친구들과', '학교 단체로', '동아리로'], required: true, order: 1 },
        { key: 'highlight', question: '가장 인상 깊었던 순간은?', placeholder: '놀라운 사실이나 장면', guide: '💡 사진 찍은 장면을 글로 묘사해보세요!', examples: ['예상과 달랐던 점', '처음 알게 된 사실', '감동받은 순간'], required: true, order: 2 },
        { key: 'takeaway', question: '이 경험에서 얻은 것은? (선택)', placeholder: '새로운 시각', guide: '💡 "다시 오고 싶다"도 훌륭!', examples: ['새 관심사 생겼어요', '시야가 넓어졌어요', '나도 배워보고 싶어'], required: false, order: 3 },
    ],
    work: [
        { key: 'task', question: '오늘 한 주요 업무는?', placeholder: '예: 보고서, 미팅, 개발', examples: ['보고서', '회의', '기획서', '이메일', '개발', '디자인'], required: true, order: 0 },
        { key: 'situation', question: '어떤 상황에서 진행했나요?', placeholder: '맥락, 배경', guide: '💡 힘든 상황에서 해낸 일이라면 꼭 기록!', examples: ['혼자', '팀과 협업', '마감 전날', '예상치 못한 변수'], required: true, order: 1 },
        { key: 'result', question: '결과나 성과는?', placeholder: '완료? 어디까지?', examples: ['완료!', '80% 진행', '초안 완성', '목표보다 빨리'], required: true, order: 2 },
        { key: 'learned', question: '오늘 얻은 것은? (선택)', placeholder: '배운 것, 개선할 점', guide: '💡 작은 인사이트도 기록!', examples: ['소통이 핵심', '일찍 시작할걸', '팀워크 중요'], required: false, order: 3 },
    ],
    project: [
        { key: 'goal', question: '오늘 목표는?', placeholder: '예: 로그인 기능 완성', examples: ['기능 구현', 'UI 디자인', '기획 정리', '버그 수정', '배포'], required: true, order: 0 },
        { key: 'action', question: '실제로 어떤 작업을 했나요?', placeholder: '무엇을 만들거나 고쳤나요?', examples: ['코드 작성', '디자인 수정', 'API 연결', '테스트', '팀원과 논의'], required: true, order: 1 },
        { key: 'result', question: '결과는? 어디까지?', placeholder: '완성도, 달성 여부', examples: ['완료!', '90% 완성', '핵심 기능 동작', '내일 마무리'], required: true, order: 2 },
        { key: 'next', question: '다음 할 일은? (선택)', placeholder: '다음 스텝', guide: '💡 아쉬운 점도 기록!', examples: ['에러 처리', '성능 최적화', '디자인 개선', '테스트 코드'], required: false, order: 3 },
    ],
    social: [
        { key: 'who', question: '누구와 무엇을 했나요?', placeholder: '예: 친구들과 저녁', examples: ['친구와 만남', '가족 모임', '동료와 식사', '새 사람과 만남', '네트워킹'], required: true, order: 0 },
        { key: 'situation', question: '어떤 분위기였나요?', placeholder: '즐거웠나요? 의미 있었나요?', guide: '💡 어떤 만남이든 소중해요!', examples: ['재미있고 유쾌', '오랜만에 편안', '새로운 자극', '조금 어색했지만 좋았어요'], required: true, order: 1 },
        { key: 'highlight', question: '가장 기억에 남는 순간은?', placeholder: '인상 깊었던 대화나 에피소드', examples: ['공감받은 이야기', '새로운 관점', '깊은 대화', '배울 점이 많았어요'], required: true, order: 2 },
        { key: 'feeling', question: '만남 후 기분은? (선택)', placeholder: '어떤 감정으로 헤어졌나요?', examples: ['에너지 충전!', '다음이 기대돼요', '고마운 마음', '또 만나고 싶어요'], required: false, order: 3 },
    ],
    creative: [
        { key: 'activity', question: '어떤 창작/취미 활동을 했나요?', placeholder: '예: 수채화, 기타 연습', examples: ['그림 그리기', '음악 연주', '글쓰기', '공예', '사진', '요리', '영상 편집'], required: true, order: 0 },
        { key: 'process', question: '어떻게 진행했나요?', placeholder: '무엇을 만들었나요?', guide: '💡 완성 못해도 OK! 과정이 중요해요.', examples: ['처음부터 끝까지', '절반쯤 진행', '새 기법 시도'], required: true, order: 1 },
        { key: 'result', question: '결과물이나 성취는?', placeholder: '완성됐나요?', examples: ['완성!', '작품 하나', '곡 외웠어요', '초안 완성'], required: true, order: 2 },
        { key: 'feeling', question: '활동하면서 느낀 점은? (선택)', placeholder: '즐거웠나요?', guide: '💡 창작의 즐거움을 기록!', examples: ['정말 즐거웠어요', '스트레스 풀렸어요', '다음엔 더 잘할수있을것같아요'], required: false, order: 3 },
    ],
    volunteer: [
        { key: 'activity', question: '어떤 봉사/나눔 활동을 했나요?', placeholder: '예: 도시락 배달', examples: ['도시락 배달', '환경 정화', '어린이 교육', '헌혈', '재능 기부'], required: true, order: 0 },
        { key: 'situation', question: '참여 계기나 배경은?', placeholder: '어떻게 참여하게 됐나요?', examples: ['공지 보고', '지인 추천', '정기 봉사', '처음 도전'], required: true, order: 1 },
        { key: 'result', question: '어떤 일을 했고 어떤 변화가?', placeholder: '한 일, 달라진 것', examples: ['50가구 배달', '쓰레기 10봉지', '따뜻한 반응'], required: true, order: 2 },
        { key: 'learned', question: '새롭게 느끼거나 배운 것은? (선택)', placeholder: '깨달음', guide: '💡 "다시 하고 싶다"도 훌륭!', examples: ['작은 행동의 힘', '다시 참여하고 싶어요', '감사함'], required: false, order: 3 },
    ],
    daily: [
        { key: 'highlight', question: '오늘 가장 기억에 남는 일은?', placeholder: '예: 친구와 저녁, 맛있는 커피', examples: ['좋은 음식', '산책', '영화', '특별한 대화', '작은 성취'], required: true, order: 0 },
        { key: 'feeling', question: '오늘 하루 전반적인 기분은?', placeholder: '어떤 감정이 주를 이뤘나요?', examples: ['활기찼어요', '평온했어요', '피곤했지만 뿌듯', '행복했어요'], required: true, order: 1 },
        { key: 'achieved', question: '오늘 이루거나 완료한 것은? (선택)', placeholder: '크든 작든', examples: ['밀린 청소', '운동', '연락', '작은 목표 달성'], required: false, order: 2 },
        { key: 'tomorrow', question: '내일 기대되는 것은? (선택)', placeholder: '기대, 계획', examples: ['친구 만남', '새 프로젝트', '운동하기', '푹 쉬기'], required: false, order: 3 },
    ],
};

async function uploadImage(file: File, userId: string): Promise<string | null> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const { error } = await supabase.storage.from('experience-images').upload(`${userId}/${Date.now()}.${ext}`, file);
    if (error) { console.warn('Image upload skipped:', error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from('experience-images').getPublicUrl(`${userId}/${Date.now()}.${ext}`);
    return publicUrl;
}

type QuestStage = 'category' | 'answering' | 'photo' | 'enrichment' | 'completed';

interface ProofDraft { url: string; title: string; }
interface CompetencyDraft { key: string; checked: Record<string, boolean>; }

export function QuestPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, refreshProgress } = useAuthStore();

    const [stage, setStage] = useState<QuestStage>('category');
    const [selectedCategory, setSelectedCategory] = useState<string>((location.state as { category?: string })?.category ?? '');
    const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<QuestAnswer[]>([]);
    const [finalAnswers, setFinalAnswers] = useState<QuestAnswer[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [newBadges, setNewBadges] = useState<NewlyEarnedBadge[]>([]);
    const [earnedStreak, setEarnedStreak] = useState(0);
    const [earnedGrowthStreak, setEarnedGrowthStreak] = useState(0);
    const [savedExpId, setSavedExpId] = useState<string | null>(null);

    // Photo
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Enrichment (증빙 URL + impact_signal + competency)
    const [proofDrafts, setProofDrafts] = useState<ProofDraft[]>([{ url: '', title: '' }]);
    const [impactType, setImpactType] = useState<'metric' | 'feedback' | 'artifact'>('metric');
    const [impactValue, setImpactValue] = useState('');
    const [competencyDrafts, setCompetencyDrafts] = useState<CompetencyDraft[]>([]);
    const [enrichmentTab, setEnrichmentTab] = useState<'proof' | 'impact' | 'competency'>('proof');
    const [enrichSaving, setEnrichSaving] = useState(false);

    // XP summary
    const [xpResult, setXpResult] = useState<{ base: number; bonus: number; total: number; breakdown: string[]; trustLabel: string } | null>(null);

    const { fontSize } = useUIStore();
    const chatEndRef = useRef<HTMLDivElement>(null);

    const getFontSizeClass = (base: string) => {
        if (fontSize === 'small') return 'text-xs';
        if (fontSize === 'large') return 'text-base';
        return base;
    };

    const getChatFontSizeClass = () => {
        if (fontSize === 'small') return 'text-[13px]';
        if (fontSize === 'large') return 'text-[18px]';
        return 'text-[15px]';
    };


    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (stage === 'answering') {
            scrollToBottom();
        }
    }, [answers, currentStep, stage]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedCategory && stage === 'category') loadPromptSet(selectedCategory);
    }, [selectedCategory]);

    useEffect(() => {
        if (stage === 'answering' && textareaRef.current) textareaRef.current.focus();
    }, [currentStep, stage]);

    const loadPromptSet = async (category: string) => {
        const { data } = await supabase.from('prompt_sets').select('*').eq('category', category).eq('is_active', true).single();
        const steps: PromptStep[] = (data?.steps as PromptStep[]) ?? BUILTIN_PROMPTS[category] ?? BUILTIN_PROMPTS['daily']!;
        const cat = CATEGORIES[category] ?? CATEGORIES['daily']!;
        setPromptSet({ id: data?.id ?? category, category, title: cat.label, steps, is_active: true, icon: cat.icon });
        setStage('answering');
        setCurrentStep(0);
        setAnswers([]);
        setCurrentAnswer('');
    };

    const appendExample = (ex: string) => { setCurrentAnswer(prev => prev ? `${prev}, ${ex}` : ex); textareaRef.current?.focus(); };

    const handleNext = () => {
        if (!promptSet) return;
        const step = promptSet.steps[currentStep];
        if (!step) return;
        if (step.required && !currentAnswer.trim()) return;
        const newAnswers = [...answers, { step_key: step.key, answer: currentAnswer.trim() }];
        setAnswers(newAnswers);
        setCurrentAnswer('');
        if (currentStep < promptSet.steps.length - 1) { setCurrentStep(s => s + 1); }
        else { setFinalAnswers(newAnswers); setStage('photo'); }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handlePhotoNext = async (skipPhoto = false) => {
        if (!user || !promptSet) return;
        setLoading(true);
        const today = getLocalDateKST();
        const titleAnswer = finalAnswers[0]?.answer ?? '기록';
        const title = titleAnswer.length > 40 ? titleAnswer.slice(0, 40) + '...' : titleAnswer;
        const structured: Record<string, string> = {};
        finalAnswers.forEach(({ step_key, answer }) => { structured[step_key] = answer; });

        let imageUrls: string[] = [];
        if (!skipPhoto && imageFile) {
            const url = await uploadImage(imageFile, user.id);
            if (url) imageUrls = [url];
        }

        try {
            const { data: exp, error: expErr } = await supabase.from('experiences').insert({
                user_id: user.id, local_date: today, category: promptSet.category,
                title, structured, xp_earned: XP_PER_QUEST, image_urls: imageUrls,
                trust_score: 0, trust_label: 'self',
            }).select().single();
            if (expErr) throw expErr;

            await supabase.from('experience_answers').insert(
                finalAnswers.map(({ step_key, answer }) => ({ experience_id: exp.id, step_key, answer }))
            );

            // 스트릭 계산
            const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
            const yKST = new Date(nowKST);
            yKST.setUTCDate(yKST.getUTCDate() - 1);
            const yesterdayStr = yKST.toISOString().split('T')[0]!;
            const [{ data: yest }, { data: currProg }] = await Promise.all([
                supabase.from('daily_progress').select('*').eq('user_id', user.id).eq('local_date', yesterdayStr).single(),
                supabase.from('daily_progress').select('*').eq('user_id', user.id).eq('local_date', today).single(),
            ]);
            const prevStreak = yest?.completed ? (yest.streak_count ?? 0) : 0;
            const newStreak = prevStreak + 1;
            const newXP = (currProg?.xp_total ?? 0) + XP_PER_QUEST;
            await supabase.from('daily_progress').upsert({
                user_id: user.id, local_date: today, completed: true,
                xp_total: newXP, streak_count: newStreak, last_completed_date: today,
            }, { onConflict: 'user_id,local_date' });

            setSavedExpId(exp.id);
            setEarnedStreak(newStreak);
            setStage('enrichment');
        } catch (err) { console.error('Quest submit error:', err); }
        finally { setLoading(false); }
    };

    const handleEnrichmentSave = async () => {
        if (!savedExpId || !user) return;
        setEnrichSaving(true);
        try {
            // 1. 증빙 URL 저장
            const validProofs = proofDrafts.filter(p => p.url.startsWith('http'));
            if (validProofs.length > 0) {
                await supabase.from('evidence_items').insert(
                    validProofs.map(p => ({ experience_id: savedExpId, type: 'url', url: p.url, title: p.title || null }))
                );
            }

            // 2. impact_signal 저장
            const hasImpact = impactValue.trim().length > 0;
            if (hasImpact) {
                await supabase.from('experiences').update({ impact_signal: { type: impactType, value: impactValue.trim() } }).eq('id', savedExpId);
            }

            // 3. 역량 저장
            const validComps = competencyDrafts.filter(d => d.key);
            const compRows: Omit<ExperienceCompetency, 'id' | 'experience_id' | 'created_at'>[] = validComps.map(d => {
                const def = COMPETENCIES.find(c => c.key === d.key)!;
                const items = def.checkItems.map(ci => ({ key: ci.key, label: ci.label, checked: d.checked[ci.key] ?? false }));
                const checkedCount = items.filter(i => i.checked).length;
                const level = calcCompetencyLevel(checkedCount);
                return { competency_key: d.key, rubric_version: 1, checklist_snapshot: items, checked_count: checkedCount, level, anchor_text: def.anchors[level] ?? '' };
            });
            if (compRows.length > 0) {
                await supabase.from('experience_competencies').insert(compRows.map(r => ({ ...r, experience_id: savedExpId })));
            }

            // 4. trust 재계산 + XP 보너스 + growth_index
            const hasProofUrl = validProofs.length > 0;
            const hasImpactSignal = hasImpact;
            const hasCompetency = validComps.length > 0;
            const trustResult = calcTrust({ hasProofUrl, hasImpactSignal, hasCompetency });
            const xpBonus = calcXPBonus({ hasCompetency, hasImpactSignal, hasProofUrl, trustLabel: trustResult.label });

            let growthIndex: number | null = null;
            if (validComps.length > 0) {
                const levels = compRows.map(r => r.level);
                growthIndex = Number((levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1));
            }

            await supabase.from('experiences').update({
                trust_score: trustResult.score,
                trust_label: trustResult.label,
                xp_earned: xpBonus.total,
                growth_index: growthIndex
            }).eq('id', savedExpId);

            // 5. daily_progress XP 보너스 반영
            const today = getLocalDateKST();
            if (xpBonus.bonus > 0) {
                const { data: curr } = await supabase.from('daily_progress').select('xp_total').eq('user_id', user.id).eq('local_date', today).single();
                await supabase.from('daily_progress').update({ xp_total: (curr?.xp_total ?? 0) + xpBonus.bonus }).eq('user_id', user.id).eq('local_date', today);
            }

            // 6. 성장 스트릭 (evidence 이상)
            let newGrowthStreak = 0;
            if (trustResult.label !== 'self') {
                const nowKST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
                const yKST = new Date(nowKST); yKST.setUTCDate(yKST.getUTCDate() - 1);
                const { data: yDP } = await supabase.from('daily_progress').select('*').eq('user_id', user.id).eq('local_date', yKST.toISOString().split('T')[0]!).single();
                const prevGrowth = yDP?.growth_completed ? (yDP.growth_streak_count ?? 0) : 0;
                newGrowthStreak = prevGrowth + 1;
                await supabase.from('daily_progress').update({ growth_completed: true, growth_streak_count: newGrowthStreak, last_growth_completed_date: today }).eq('user_id', user.id).eq('local_date', today);
            }
            setEarnedGrowthStreak(newGrowthStreak);

            // 7. 배지 체크
            const earned = await checkAndAwardBadges(user.id, earnedStreak, finalAnswers, newGrowthStreak);
            setNewBadges(earned);
            setXpResult({ ...xpBonus, trustLabel: trustResult.label });
            await refreshProgress();
            setStage('completed');
        } catch (err) { console.error('Enrichment save error:', err); }
        finally { setEnrichSaving(false); }
    };

    const checkAndAwardBadges = async (userId: string, streak: number, answers: QuestAnswer[], growthStreak: number): Promise<NewlyEarnedBadge[]> => {
        const [{ data: allBadges }, { data: userBadges }, { data: totalExp }, { data: xpData }, { data: catData }, { data: evidenceData }, { data: impactData }, { data: compData }] = await Promise.all([
            supabase.from('badges').select('*'),
            supabase.from('user_badges').select('badge_id').eq('user_id', userId),
            supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', userId),
            supabase.from('daily_progress').select('xp_total').eq('user_id', userId),
            supabase.from('experiences').select('category').eq('user_id', userId),
            supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', userId).neq('trust_label', 'self'),
            supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', userId).not('impact_signal', 'is', null),
            supabase.from('experience_competencies').select('competency_key').eq('experience_id', savedExpId ?? ''),
        ]);
        const earned = new Set((userBadges ?? []).map((u: { badge_id: string }) => u.badge_id));
        const totalCount = totalExp?.length ?? 0;
        const totalXP = (xpData ?? []).reduce((s: number, r: { xp_total: number }) => s + r.xp_total, 0);
        const distinctCats = new Set((catData ?? []).map((e: { category: string }) => e.category)).size;
        const writingDepth = answers.reduce((s, a) => s + a.answer.length, 0);
        const evidenceCount = evidenceData?.length ?? 0;
        const impactCount = impactData?.length ?? 0;
        const diversityComp = new Set((compData ?? []).map((c: { competency_key: string }) => c.competency_key)).size;

        const newlyEarned: NewlyEarnedBadge[] = [];
        for (const badge of (allBadges ?? [])) {
            if (earned.has(badge.id)) continue;
            const c = badge.criteria as { type: string; value: number };
            let ok = false;
            if (c.type === 'streak' && streak >= c.value) ok = true;
            if (c.type === 'total_experiences' && totalCount >= c.value) ok = true;
            if (c.type === 'total_xp' && totalXP >= c.value) ok = true;
            if (c.type === 'writing_depth' && writingDepth >= c.value) ok = true;
            if (c.type === 'category_diversity' && distinctCats >= c.value) ok = true;
            if (c.type === 'growth_streak' && growthStreak >= c.value) ok = true;
            if (c.type === 'evidence_count' && evidenceCount >= c.value) ok = true;
            if (c.type === 'impact_signal_count' && impactCount >= c.value) ok = true;
            if (c.type === 'diversity_categories' && diversityComp >= c.value) ok = true;
            if (ok) { await supabase.from('user_badges').insert({ user_id: userId, badge_id: badge.id }); newlyEarned.push({ ...badge, newly_earned: true }); }
        }
        return newlyEarned;
    };

    const step = promptSet?.steps[currentStep];
    const catInfo = CATEGORIES[selectedCategory] ?? CATEGORIES['daily']!;
    const trustInfo = TRUST_LABELS[xpResult?.trustLabel ?? 'self']!;

    return (
        <div className="flex flex-col bg-white" style={{ height: '100dvh' }}>
            {/* Header */}
            <div className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100">
                    {stage === 'answering' ? <X size={22} className="text-gray-500" /> : <ChevronLeft size={22} className="text-gray-500" />}
                </button>
                <p className={cn("font-semibold text-brand-500", getFontSizeClass('text-sm'))}>
                    {stage === 'answering' ? `${catInfo.icon} ${catInfo.label}` : stage === 'photo' ? '📸 활동 사진' : stage === 'enrichment' ? '✨ 기록 강화하기' : '오늘의 퀘스트'}
                </p>
            </div>

            {/* ── Category ── */}
            {stage === 'category' && (
                <div className="flex-1 px-5 py-6 animate-fade-in">
                    <h2 className="text-2xl font-extrabold text-gray-900 mb-1">어떤 기록을 할까요?</h2>
                    <p className="text-gray-400 text-sm mb-5">카테고리를 선택하면 맞춤 질문을 드려요</p>
                    <div className="space-y-2.5">
                        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                            <button key={key} onClick={() => { setSelectedCategory(key); loadPromptSet(key); }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all text-left">
                                <span className="text-2xl w-9 text-center">{icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 text-sm">{label}</div>
                                    <div className="text-xs text-gray-400 truncate">{getCategoryDesc(key)}</div>
                                </div>
                                <ChevronLeft className="rotate-180 text-gray-300 flex-shrink-0" size={18} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Answering ── KakaoTalk-style: fixed screen, scrollable chat, pinned input */}
            {stage === 'answering' && promptSet && step && (
                <div
                    className="flex flex-col"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 40,
                        background: '#fff',
                    }}
                >
                    {/* Header inside fixed container */}
                    <div className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100 flex-shrink-0">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100">
                            <X size={22} className="text-gray-500" />
                        </button>
                        <p className={cn("font-semibold text-brand-500", getFontSizeClass('text-sm'))}>
                            {catInfo.icon} {catInfo.label}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="px-5 pt-3 pb-1 flex-shrink-0">
                        <div className="flex gap-1.5 mb-1">
                            {promptSet.steps.map((_, i) => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < currentStep ? 'bg-brand-500' : i === currentStep ? 'bg-brand-300' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 text-right">{currentStep + 1} / {promptSet.steps.length}</p>
                    </div>

                    {/* Chat messages - scrollable */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
                        {answers.map((ans, idx) => {
                            const s = promptSet.steps[idx];
                            return s ? (
                                <div key={idx} className="space-y-2 animate-fade-in">
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">V</div>
                                        <div className={cn("bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-gray-700 max-w-[80%]", getChatFontSizeClass())}>{s.question}</div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className={cn("bg-brand-500 rounded-2xl rounded-tr-sm px-4 py-3 text-white max-w-[80%]", getChatFontSizeClass())}>{ans.answer || '(건너뜀)'}</div>
                                    </div>
                                </div>
                            ) : null;
                        })}
                        <div className="flex items-start gap-2 animate-slide-up">
                            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">V</div>
                            <div className={cn("bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-gray-800 font-medium max-w-[85%]", getChatFontSizeClass())}>
                                {step.question}{!step.required && <span className="text-gray-400 text-xs ml-1">(선택)</span>}
                            </div>
                        </div>
                        {step.guide && <p className="text-xs text-gray-400 pl-9 -mt-2">{step.guide}</p>}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input area - pinned to bottom */}
                    <div className="flex-shrink-0 px-5 pb-6 border-t border-gray-100 pt-4 bg-white">
                        {step.examples && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {step.examples.map(ex => (
                                    <button key={ex} onClick={() => appendExample(ex)}
                                        className="text-xs bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full border border-brand-200 hover:bg-brand-100 transition-all">
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={currentAnswer}
                            onChange={e => setCurrentAnswer(e.target.value)}
                            placeholder={step.placeholder}
                            rows={3}
                            style={{ fontSize: '16px' }}
                            className={cn(
                                "w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-brand-400 transition-all",
                            )}
                        />
                        <div className="flex gap-3 mt-3">
                            {!step.required && <Button variant="secondary" onClick={handleNext} className="flex-1">건너뛰기</Button>}
                            <Button onClick={handleNext} disabled={step.required && !currentAnswer.trim()} className="flex-1">
                                {currentStep < promptSet.steps.length - 1 ? '다음 →' : '완료 →'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Photo ── */}
            {stage === 'photo' && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 animate-fade-in">
                    <div className="text-5xl mb-4">📸</div>
                    <h2 className="text-xl font-extrabold text-gray-900 mb-2">활동 사진 추가</h2>
                    <p className="text-gray-500 text-sm text-center mb-8">나중에 포트폴리오로 활용할 수 있어요!</p>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                    {imagePreview ? (
                        <div className="relative w-full max-w-xs mb-6">
                            <img src={imagePreview} alt="preview" className="w-full rounded-2xl object-cover max-h-48" />
                            <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs">✕</button>
                        </div>
                    ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-xs h-36 border-2 border-dashed border-brand-300 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-50 transition-all mb-6">
                            <ImagePlus size={32} className="text-brand-400" />
                            <span className="text-sm font-semibold text-brand-500">사진 선택 / 촬영</span>
                        </button>
                    )}
                    <div className="flex flex-col gap-3 w-full">
                        <Button fullWidth size="lg" loading={loading} onClick={() => handlePhotoNext(false)}>
                            {imageFile ? '📸 사진 포함해서 다음' : '다음 →'}
                        </Button>
                        <Button fullWidth variant="secondary" onClick={() => handlePhotoNext(true)}>사진 없이 다음</Button>
                    </div>
                </div>
            )}

            {/* ── Enrichment ── */}
            {stage === 'enrichment' && (
                <div className="flex-1 flex flex-col animate-fade-in overflow-hidden">
                    <div className="px-5 pt-4 pb-2">
                        <h2 className="text-xl font-extrabold text-gray-900">기록을 강화하세요 ✨</h2>
                        <p className="text-sm text-gray-500 mt-1">추가할수록 신뢰도 배지와 XP 보너스를 받아요</p>
                        {/* Tab */}
                        <div className="flex gap-1 mt-4 bg-gray-100 rounded-2xl p-1">
                            {[{ id: 'proof', label: '🔗 증빙 링크' }, { id: 'impact', label: '📊 성과 수치' }, { id: 'competency', label: '💡 역량 체크' }].map(t => (
                                <button key={t.id} onClick={() => setEnrichmentTab(t.id as typeof enrichmentTab)}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${enrichmentTab === t.id ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {/* Proof Tab */}
                        {enrichmentTab === 'proof' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-400 mb-2">URL을 붙여넣으면 증빙 링크로 저장돼요 (최대 3개)</p>
                                {proofDrafts.map((p, i) => (
                                    <div key={i} className="space-y-2 bg-gray-50 rounded-2xl p-3">
                                        <input value={p.url} onChange={e => { const d = [...proofDrafts]; d[i] = { ...d[i], url: e.target.value }; setProofDrafts(d); }}
                                            placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-400" />
                                        <input value={p.title} onChange={e => { const d = [...proofDrafts]; d[i] = { ...d[i], title: e.target.value }; setProofDrafts(d); }}
                                            placeholder="제목 (선택)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-400" />
                                        {i > 0 && <button onClick={() => setProofDrafts(d => d.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-red-400"><Trash2 size={12} />삭제</button>}
                                    </div>
                                ))}
                                {proofDrafts.length < 3 && (
                                    <button onClick={() => setProofDrafts(d => [...d, { url: '', title: '' }])} className="flex items-center gap-2 text-sm text-brand-500 font-semibold">
                                        <Plus size={16} />링크 추가
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Impact Tab */}
                        {enrichmentTab === 'impact' && (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-400">전/후 수치, 피드백, 결과물 등 구체적인 성과를 기록하면 XP +10을 드려요</p>
                                <div className="flex gap-2">
                                    {[{ v: 'metric', l: '📈 수치/지표' }, { v: 'feedback', l: '💬 피드백' }, { v: 'artifact', l: '📄 결과물' }].map(t => (
                                        <button key={t.v} onClick={() => setImpactType(t.v as typeof impactType)}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${impactType === t.v ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500'}`}>
                                            {t.l}
                                        </button>
                                    ))}
                                </div>
                                <textarea value={impactValue} onChange={e => setImpactValue(e.target.value)} rows={4}
                                    placeholder={impactType === 'metric' ? '예: 달리기 5km → 6km으로 향상, 처리 시간 2시간 → 45분 단축' : impactType === 'feedback' ? '예: 팀장님 "이번 보고서 정말 완성도 높았어"' : '예: GitHub 링크, 발표 자료 URL, 완성된 작품 설명'}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-brand-400 resize-none" />
                            </div>
                        )}

                        {/* Competency Tab */}
                        {enrichmentTab === 'competency' && (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-400">이 경험과 관련된 역량을 1~3개 골라 체크리스트에 답해보세요</p>
                                {COMPETENCIES.map(comp => {
                                    const draft = competencyDrafts.find(d => d.key === comp.key);
                                    const isSelected = !!draft;
                                    return (
                                        <div key={comp.key} className={`rounded-2xl border-2 overflow-hidden transition-all ${isSelected ? 'border-brand-300 bg-brand-50' : 'border-gray-200'}`}>
                                            <button onClick={() => {
                                                if (isSelected) { setCompetencyDrafts(d => d.filter(x => x.key !== comp.key)); }
                                                else if (competencyDrafts.length < 3) { setCompetencyDrafts(d => [...d, { key: comp.key, checked: {} }]); }
                                            }} className="w-full flex items-center gap-3 p-3 text-left">
                                                <span className="text-xl">{comp.icon}</span>
                                                <div className="flex-1"><p className="font-semibold text-sm text-gray-900">{comp.label}</p><p className="text-xs text-gray-400">{comp.description}</p></div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
                                                    {isSelected && <span className="text-white text-xs">✓</span>}
                                                </div>
                                            </button>
                                            {isSelected && (
                                                <div className="px-4 pb-3 space-y-2">
                                                    {comp.checkItems.map(ci => {
                                                        const checked = draft.checked[ci.key] ?? false;
                                                        return (
                                                            <button key={ci.key} onClick={() => {
                                                                setCompetencyDrafts(d => d.map(x => x.key === comp.key ? { ...x, checked: { ...x.checked, [ci.key]: !checked } } : x));
                                                            }} className="flex items-center gap-3 w-full text-left">
                                                                {checked ? <CheckSquare size={18} className="text-brand-500 flex-shrink-0" /> : <Square size={18} className="text-gray-300 flex-shrink-0" />}
                                                                <span className="text-sm text-gray-700">{ci.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                    {(() => {
                                                        const cnt = Object.values(draft.checked).filter(Boolean).length;
                                                        const lvl = calcCompetencyLevel(cnt);
                                                        const anchor = COMPETENCIES.find(c => c.key === comp.key)?.anchors[lvl];
                                                        return <p className="text-xs font-bold text-brand-600 mt-2">레벨 {lvl}: {anchor}</p>;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="px-5 pb-8 pt-3 border-t border-gray-100 space-y-3">
                        <Button fullWidth size="lg" loading={enrichSaving} onClick={handleEnrichmentSave}>저장하고 완료! 🎉</Button>
                        <Button fullWidth variant="secondary" onClick={async () => { await checkAndAwardBadges(user!.id, earnedStreak, finalAnswers, 0); setXpResult({ base: 20, bonus: 0, total: 20, breakdown: [], trustLabel: 'self' }); await refreshProgress(); setStage('completed'); }}>강화 없이 완료</Button>
                    </div>
                </div>
            )}

            {/* ── Completed ── */}
            {stage === 'completed' && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center overflow-y-auto">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">퀘스트 완료!</h2>
                    <p className="text-gray-500 mb-6">오늘도 한 걸음 성장했어요</p>

                    {/* XP 상세 */}
                    {xpResult ? (
                        <div className="bg-gradient-to-br from-xp-400 to-xp-500 rounded-3xl px-6 py-5 mb-4 w-full shadow-lg">
                            <p className="text-white/80 text-sm mb-1">획득한 경험치</p>
                            <p className="text-4xl font-extrabold text-white">+{xpResult.total} XP</p>
                            {xpResult.breakdown.length > 0 && (
                                <div className="mt-2 space-y-0.5">
                                    <p className="text-white/70 text-xs">기본 +{xpResult.base}</p>
                                    {xpResult.breakdown.map(b => <p key={b} className="text-white/90 text-xs font-semibold">{b}</p>)}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-xp-400 to-xp-500 rounded-3xl px-6 py-5 mb-4 w-full shadow-lg">
                            <p className="text-white/80 text-sm mb-1">획득한 경험치</p>
                            <p className="text-4xl font-extrabold text-white">+{XP_PER_QUEST} XP</p>
                        </div>
                    )}

                    {/* trust 배지 */}
                    {xpResult && (
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${trustInfo.bg}`}>
                            <span>{trustInfo.icon}</span>
                            <span className={`text-sm font-bold ${trustInfo.color}`}>신뢰도: {trustInfo.label}</span>
                        </div>
                    )}

                    <div className="flex gap-3 mb-5 w-full">
                        <div className="flex-1 flex flex-col items-center gap-1 bg-orange-50 rounded-2xl p-4">
                            <span className="text-2xl">🔥</span>
                            <span className="font-bold text-orange-500 text-sm">{earnedStreak}일 스트릭</span>
                        </div>
                        {earnedGrowthStreak > 0 && (
                            <div className="flex-1 flex flex-col items-center gap-1 bg-green-50 rounded-2xl p-4">
                                <span className="text-2xl">🌿</span>
                                <span className="font-bold text-green-600 text-sm">성장 {earnedGrowthStreak}일</span>
                            </div>
                        )}
                    </div>

                    {newBadges.length > 0 && (
                        <div className="bg-brand-50 rounded-2xl p-5 mb-5 w-full">
                            <p className="font-bold text-brand-700 mb-3">🏅 새 배지 획득!</p>
                            {newBadges.map(b => (
                                <div key={b.id} className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{b.icon}</span>
                                    <div className="text-left"><p className="font-bold text-brand-700 text-sm">{b.name}</p><p className="text-brand-500 text-xs">{b.description}</p></div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 w-full">
                        <Button fullWidth size="lg" onClick={() => navigate('/')}>홈으로</Button>
                        <Button fullWidth variant="secondary" onClick={() => navigate('/timeline')}>내 기록 보기</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function getCategoryDesc(key: string): string {
    const descs: Record<string, string> = {
        exercise: '운동, 스포츠, 건강 관리', study: '공부, 독서, 스킬 향상',
        experience: '견학, 체험, 여행, 문화생활', work: '업무, 직장, 커리어',
        project: '사이드 프로젝트, 창작', social: '사람, 관계, 네트워킹',
        creative: '예술, 공예, 취미 활동', volunteer: '봉사, 기부, 나눔', daily: '일상, 감정, 소소한 일',
    };
    return descs[key] ?? '';
}
