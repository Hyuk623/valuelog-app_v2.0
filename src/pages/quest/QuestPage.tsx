import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { CATEGORIES, XP_PER_QUEST, getLevelFromXP, getLocalDateKST, SKILLS } from '@/types';
import type { PromptSet, PromptStep, QuestAnswer, Experience, ExperienceAnswer, ExperienceCompetency, ExperienceSkill, Skill, NewlyEarnedBadge, CategoryKey } from '@/types';
import { COMPETENCIES, calcCompetencyLevel, calcTrust, calcXPBonus, TRUST_LABELS } from '@/lib/competencies';
import { calcQualityScore } from '@/lib/quality';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Send, Check, Sparkles, Plus, Trash2, ExternalLink, Award, Share2, Square, CheckSquare, Wrench, Tag, Zap, X, ImagePlus } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

// ===================== Tutorial Component =====================
function TutorialBubble({ text, pointer = 'bottom', className = '' }: { text: string; pointer?: 'bottom' | 'top' | 'right' | 'left'; className?: string }) {
    return (
        <div className={`absolute z-[60] animate-bounce pointer-events-none drop-shadow-xl ${className}`}>
            <div className="bg-brand-500 text-white text-[12px] font-extrabold px-4 py-2.5 rounded-2xl relative shadow-[0_4px_12px_rgba(0,0,0,0.2)] whitespace-pre-wrap text-center leading-relaxed">
                {text}
                {pointer === 'bottom' && (
                    <div className="absolute w-3.5 h-3.5 bg-brand-500 rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2 rounded-[2px]" />
                )}
                {pointer === 'top' && (
                    <div className="absolute w-3.5 h-3.5 bg-brand-500 rotate-45 -top-1.5 left-1/2 -translate-x-1/2 rounded-[2px]" />
                )}
            </div>
        </div>
    );
}

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
    const filename = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('experience-images').upload(filename, file);
    if (error) { console.warn('Image upload skipped:', error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from('experience-images').getPublicUrl(filename);
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
    const [isTutorial] = useState<boolean>((location.state as any)?.isTutorial ?? false);
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

    // Photo
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Enrichment (증빙 URL + impact_signal + competency)
    const [proofDrafts, setProofDrafts] = useState<ProofDraft[]>([{ url: '', title: '' }]);
    const [impactType, setImpactType] = useState<'metric' | 'feedback' | 'artifact'>('metric');
    const [impactValue, setImpactValue] = useState('');
    const [competencyDrafts, setCompetencyDrafts] = useState<CompetencyDraft[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [enrichmentTab, setEnrichmentTab] = useState<'proof' | 'impact' | 'competency' | 'skill'>('proof');
    const [enrichSaving, setEnrichSaving] = useState(false);

    // XP summary
    const [xpResult, setXpResult] = useState<{ base: number; bonus: number; total: number; breakdown: string[]; trustLabel: string } | null>(null);

    const { fontSize } = useUIStore();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [savedExpId, setSavedExpId] = useState<string | null>(null);

    // Telegram/Discord-style Bulletproof Mobile Keyboard Tracker
    useEffect(() => {
        if (stage !== 'answering') return;

        const updateViewport = () => {
            if (!chatContainerRef.current) return;
            const vv = window.visualViewport;
            // 뷰포트의 실제 높이와, 사파리가 화면을 위로 밀어올린 만큼의 offsetTop을 구합니다.
            const h = vv ? vv.height : window.innerHeight;
            const y = vv ? vv.offsetTop : 0;
            
            chatContainerRef.current.style.height = `${h}px`;
            // 사파리가 화면을 위로 밀어올려도, 그만큼 아래로 translateY 시켜서 시각적으로 고정시킵니다.
            chatContainerRef.current.style.transform = `translateY(${y}px)`;
            
            // 키보드가 올라오는 동안 채팅창 최하단 유지
            setTimeout(scrollToBottom, 50);
        };

        window.visualViewport?.addEventListener('resize', updateViewport);
        window.visualViewport?.addEventListener('scroll', updateViewport);
        window.addEventListener('scroll', updateViewport);
        
        updateViewport();

        // 바디 바운스 효과 차단
        const originalOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = 'none';

        return () => {
            window.visualViewport?.removeEventListener('resize', updateViewport);
            window.visualViewport?.removeEventListener('scroll', updateViewport);
            window.removeEventListener('scroll', updateViewport);
            document.body.style.overscrollBehavior = originalOverscroll;
        };
    }, [stage]);

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
        const container = chatMessagesRef.current;
        if (container) {
            // Use setTimeout to ensure the layout has updated
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    };

    useEffect(() => {
        if (stage === 'answering') {
            scrollToBottom();
        }
    }, [answers, currentStep, stage]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (stage === 'answering' && textareaRef.current) {
            textareaRef.current.focus();
            scrollToBottom();
        }
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

    const appendExample = (ex: string) => {
        setCurrentAnswer(prev => prev ? `${prev}, ${ex}` : ex);
        textareaRef.current?.focus();
        // Trigger height adjustment after state update
        setTimeout(adjustTextareaHeight, 0);
    };

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = '40px'; // Base height for 1 line
        const scrollHeight = textarea.scrollHeight;
        // Limit max height to around 3 lines (approx 80px)
        const maxHeight = 80;
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [currentAnswer]);

    useEffect(() => {
        if (selectedCategory && stage === 'category') loadPromptSet(selectedCategory);
    }, [selectedCategory, stage]);

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
            const totalLength = finalAnswers.reduce((sum, a) => sum + a.answer.length, 0);
            const initialQuality = calcQualityScore({
                answerCount: finalAnswers.length,
                totalLength,
                imageCount: imageUrls.length,
                evidenceCount: 0,
                hasImpact: false,
                competencyCount: 0
            });

            const { data: exp, error: expErr } = await supabase.from('experiences').insert({
                user_id: user.id, local_date: today, category: promptSet.category,
                title, structured, xp_earned: XP_PER_QUEST, image_urls: imageUrls,
                trust_score: 0, trust_label: 'self', quality_score: initialQuality,
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

            const totalLength = finalAnswers.reduce((sum, a) => sum + a.answer.length, 0);
            const enrichQuality = calcQualityScore({
                answerCount: finalAnswers.length,
                totalLength,
                imageCount: imageFile ? 1 : 0,
                evidenceCount: validProofs.length,
                hasImpact: hasImpact,
                competencyCount: validComps.length
            });

            await supabase.from('experiences').update({
                trust_score: trustResult.score,
                trust_label: trustResult.label,
                quality_score: enrichQuality,
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
            if (earned.length > 0) setNewBadges(earned);

            // Mark tutorial as done
            localStorage.setItem('tutorial_done', 'true');

            await refreshProgress();
            setStage('completed');
        } catch (err) { console.error('Enrichment save error:', err); }
        finally { setEnrichSaving(false); }
    };

    const checkAndAwardBadges = async (userId: string, streak: number, answers: QuestAnswer[], growthStreak: number): Promise<NewlyEarnedBadge[]> => {
        const { data: userExps } = await supabase.from('experiences').select('id').eq('user_id', userId);
        const expIds = userExps?.map(e => e.id) || [];
        const [{ data: allBadges }, { data: userBadges }, { data: totalExp }, { data: xpData }, { data: catData }, { data: evidenceData }, { data: impactData }, { data: compData }] = await Promise.all([
            supabase.from('badges').select('*'),
            supabase.from('user_badges').select('badge_id').eq('user_id', userId),
            supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', userId),
            supabase.from('daily_progress').select('xp_total').eq('user_id', userId),
            supabase.from('experiences').select('category').eq('user_id', userId),
            supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', userId).neq('trust_label', 'self'),
            supabase.from('experiences').select('id', { count: 'exact' }).eq('user_id', userId).not('impact_signal', 'is', null),
            supabase.from('experience_competencies').select('competency_key').in('experience_id', expIds.length > 0 ? expIds : ['']),
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
        <div className="flex flex-col bg-surface overflow-hidden w-full h-[100dvh]">
            {/* Header - Only for stages except answering */}
            {stage !== 'answering' && (
                <div className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-border transition-colors flex-shrink-0">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-2 transition-colors">
                        <ChevronLeft size={22} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <p className={cn("font-semibold text-brand-500", getFontSizeClass('text-sm'))}>
                        {stage === 'photo' ? '📸 활동 사진' : stage === 'enrichment' ? '✨ 기록 강화하기' : stage === 'completed' ? '저장 완료' : '경험 기록하기'}
                    </p>
                </div>
            )}

            {/* ── Category ── */}
            {stage === 'category' && (
                <div className="flex-1 px-5 py-6 animate-fade-in overflow-y-auto">
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-1 transition-colors">어떤 기록을 할까요?</h2>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mb-5 transition-colors">카테고리를 선택하면 맞춤 질문을 드려요</p>
                    <div className="space-y-2.5">
                        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                            <button key={key} onClick={() => { setSelectedCategory(key); loadPromptSet(key); }}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border dark:border-gray-800 hover:border-brand-200 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all text-left">
                                <span className="text-2xl w-9 text-center">{icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 dark:text-gray-100 text-sm transition-colors">{label}</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate transition-colors">{getCategoryDesc(key)}</div>
                                </div>
                                <ChevronLeft className="rotate-180 text-gray-300 dark:text-gray-600 flex-shrink-0" size={18} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Answering ── Bulletproof visual viewport fixed layout */}
            {stage === 'answering' && promptSet && step && (
                <div ref={chatContainerRef} className="flex flex-col bg-surface z-50 shadow-2xl" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh' }}>
                    {/* Unified Header & Progress - Ultra Compact */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border flex-shrink-0 bg-surface">
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate(-1)} className="p-1 rounded-xl hover:bg-surface-2 transition-colors">
                                <X size={20} className="text-gray-500 dark:text-gray-400" />
                            </button>
                            <span className={cn("font-bold text-brand-500", getFontSizeClass('text-sm'))}>
                                {catInfo.icon} {catInfo.label}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] font-black text-brand-400 tracking-wider">
                                {currentStep + 1} / {promptSet.steps.length}
                            </span>
                        </div>
                    </div>

                    {/* Chat messages - scrollable */}
                    <div ref={chatMessagesRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
                        {answers.map((ans, idx) => {
                            const s = promptSet.steps[idx];
                            return s ? (
                                <div key={idx} className="space-y-2 animate-fade-in">
                                    <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded-full bg-brand-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">V</div>
                                        <div className={cn("quest-bubble bg-surface-2 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] border border-border transition-colors", getChatFontSizeClass())}>{s.question}</div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className={cn("bg-brand-500 rounded-2xl rounded-tr-sm px-3 py-2 text-white max-w-[85%]", getChatFontSizeClass())}>{ans.answer || '−'}</div>
                                    </div>
                                </div>
                            ) : null;
                        })}
                        <div className="flex items-start gap-2 animate-slide-up">
                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">V</div>
                            <div className={cn("quest-question-bubble bg-brand-50 rounded-2xl rounded-tl-sm px-3 py-2 font-bold border border-brand-100 max-w-[85%] shadow-sm transition-colors", getChatFontSizeClass())}>
                                {step.question}{!step.required && <span className="text-brand-300 text-[10px] ml-1 font-normal">(옵션)</span>}
                            </div>
                        </div>
                        {step.guide && <p className="text-[10px] text-gray-400 pl-8 -mt-2 italic opacity-80">{step.guide}</p>}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input area - Strictly Ultra-Compact */}
                    <div className="flex-shrink-0 px-3 pb-3 border-t border-border pt-2 bg-surface shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.3)] transition-colors">
                        {step.examples && (
                            <div
                                className="flex gap-2 mb-2 no-scrollbar px-1"
                                style={{
                                    flexWrap: 'nowrap',
                                    overflowX: 'auto',
                                    WebkitOverflowScrolling: 'touch',
                                    display: 'flex'
                                }}
                            >
                                {step.examples.map(ex => (
                                    <button key={ex} onClick={() => appendExample(ex)}
                                        className="quest-chip whitespace-nowrap text-[10px] font-extrabold bg-brand-50/50 text-brand-600 px-3 py-1.5 rounded-full border border-brand-200 active:scale-90 transition-all flex-shrink-0">
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex items-end gap-2 px-1">
                            <textarea
                                ref={textareaRef}
                                value={currentAnswer}
                                onChange={e => {
                                    setCurrentAnswer(e.target.value);
                                    adjustTextareaHeight();
                                }}
                                onFocus={() => {
                                    setTimeout(() => {
                                        scrollToBottom();
                                    }, 100);
                                }}
                                placeholder={step.placeholder}
                                rows={1}
                                style={{
                                    fontSize: '16px',
                                    height: '40px',
                                    minHeight: '40px',
                                    maxHeight: '80px',
                                    lineHeight: '1.2',
                                    paddingTop: '10px',
                                    paddingBottom: '10px'
                                }}
                                className={cn(
                                    "flex-1 px-3 rounded-xl border-2 border-border dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-brand-400 transition-all bg-surface-2 dark:bg-gray-800/10",
                                )}
                            />
                            {isTutorial && currentStep === 0 && !currentAnswer && (
                                <TutorialBubble text="이곳을 눌러 오늘의 활동을\n가볍게 적어보세요." pointer="bottom" className="bottom-[120%] mb-1 left-4" />
                            )}
                            {isTutorial && currentStep === 0 && currentAnswer && (
                                <TutorialBubble text="좋아요! 다 적었다면\n전송 버튼을 눌러주세요." pointer="bottom" className="bottom-[120%] mb-1 right-2" />
                            )}
                            <Button
                                onClick={handleNext}
                                disabled={step.required && !currentAnswer.trim()}
                                size="sm"
                                className="h-10 w-10 rounded-full flex-shrink-0 p-0 flex items-center justify-center shadow-md shadow-brand-100 relative"
                            >
                                <Plus size={18} className={currentStep < promptSet.steps.length - 1 ? "" : "rotate-45 transition-transform"} />
                            </Button>
                        </div>
                        {!step.required && (
                            <div className="flex justify-center mt-1.5">
                                <button
                                    onClick={handleNext}
                                    className="text-[9px] font-black text-gray-300 dark:text-gray-600 hover:text-brand-400 transition-colors uppercase tracking-[0.3em]"
                                >
                                    Skip Question
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Photo ── */}
            {stage === 'photo' && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 animate-fade-in bg-surface transition-colors">
                    <div className="text-5xl mb-4">📸</div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 transition-colors">활동 사진 추가</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-8 transition-colors">나중에 포트폴리오로 활용할 수 있어요!<br /><span className="text-[11px] opacity-70">어플이나 사진첩에서 선택할 수 있습니다.</span></p>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                    {imagePreview ? (
                        <div className="relative w-full max-w-xs mb-6">
                            <img src={imagePreview} alt="preview" className="w-full rounded-2xl object-cover max-h-48 shadow-lg border border-border" />
                            <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-2 -right-2 w-7 h-7 bg-gray-800 dark:bg-gray-700 text-white rounded-full flex items-center justify-center text-xs transition-colors">✕</button>
                        </div>
                    ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-xs h-36 border-2 border-dashed border-brand-300 dark:border-brand-900/40 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all mb-6">
                            <ImagePlus size={32} className="text-brand-400" />
                            <span className="text-sm font-semibold text-brand-500">사진 선택 / 촬영</span>
                        </button>
                    )}

                    {isTutorial && !imageFile && (
                        <div className="relative w-full max-w-xs h-0 flex justify-center">
                            <TutorialBubble text="기록을 더 생생하게!\n사진을 추가해보거나\n그냥 건너뛸 수도 있어요." pointer="bottom" className="bottom-2 mb-2" />
                        </div>
                    )}

                    <div className="flex flex-col gap-3 w-full">
                        <Button fullWidth size="lg" loading={loading} onClick={() => handlePhotoNext(false)} disabled={!imageFile}>
                            {imageFile ? '📸 사진 포함해서 다음' : '사진을 선택해주세요'}
                        </Button>
                        <Button fullWidth variant="secondary" onClick={() => handlePhotoNext(true)}>사진 없이 다음</Button>
                    </div>
                </div>
            )}

            {/* ── Enrichment ── */}
            {stage === 'enrichment' && (
                <div className="flex-1 flex flex-col bg-surface animate-fade-in overflow-hidden transition-colors">
                    <div className="px-5 pt-4 pb-2">
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">이 기록의 가치를 높이세요 ✨</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">증빙 자료나 성과를 추가하면 나중에 다시 꺼내 쓰기 더 좋은 자산이 됩니다.</p>

                        {isTutorial && enrichmentTab === 'proof' && (
                            <TutorialBubble text="기록을 증명할 수 있는 것들을\n추가해볼까요? 우선 탭들을 훑어보세요." pointer="top" className="top-full mt-2 left-5 z-50" />
                        )}

                        {/* Tab */}
                        <div className="flex gap-1 mt-4 bg-surface-2 dark:bg-gray-800 rounded-2xl p-1 border border-border transition-colors relative h-11 overflow-x-auto hide-scrollbar">
                            {/* Tutorial Bubble for Competency Tab */}
                            {isTutorial && enrichmentTab === 'proof' && (
                                <TutorialBubble text="마지막 핵심!\n역량 탭을 눌러 내가 발휘한\n강점을 찾아보세요." pointer="top" className="top-[110%] right-4 z-50 mt-1" />
                            )}
                            {[
                                { id: 'proof', label: '🔗 증빙' }, 
                                { id: 'skill', label: '🛠️ 스킬' },
                                { id: 'impact', label: '📊 성과' }, 
                                { id: 'competency', label: '💡 역량' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setEnrichmentTab(t.id as typeof enrichmentTab)}
                                    className={`flex-1 py-1 px-2 whitespace-nowrap text-[11px] font-bold rounded-xl transition-all ${enrichmentTab === t.id ? 'bg-surface shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {/* Proof Tab */}
                        {enrichmentTab === 'proof' && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 transition-colors">URL을 붙여넣으면 증빙 링크로 저장돼요 (최대 3개)</p>
                                {proofDrafts.map((p, i) => (
                                    <div key={i} className="space-y-2 bg-surface-2 dark:bg-gray-800/40 rounded-2xl p-3 border border-border transition-colors">
                                        <input value={p.url} onChange={e => { const d = [...proofDrafts]; d[i] = { ...d[i], url: e.target.value }; setProofDrafts(d); }}
                                            placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-400 dark:text-gray-100 transition-colors" />
                                        <input value={p.title} onChange={e => { const d = [...proofDrafts]; d[i] = { ...d[i], title: e.target.value }; setProofDrafts(d); }}
                                            placeholder="제목 (선택)" className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-400 dark:text-gray-100 transition-colors" />
                                        {i > 0 && <button onClick={() => setProofDrafts(d => d.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-red-400 transition-colors"><Trash2 size={12} />삭제</button>}
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
                            <div className="space-y-4 relative">
                                {isTutorial && (
                                    <TutorialBubble text="숫자나 객관적인 변화량을 적으면\n성장 수치가 더 정확하게 계산돼요!" pointer="top" className="top-10 left-5 z-50 mt-1" />
                                )}
                                <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">전/후 수치, 피드백, 결과물 등 구체적인 성과를 기록하면 XP +10을 드려요</p>
                                <div className="flex gap-2">
                                    {[{ v: 'metric', l: '📈 수치/지표' }, { v: 'feedback', l: '💬 피드백' }, { v: 'artifact', l: '📄 결과물' }].map(t => (
                                        <button key={t.v} onClick={() => setImpactType(t.v as typeof impactType)}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${impactType === t.v ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400' : 'border-border bg-surface-2 text-gray-500 dark:text-gray-400'}`}>
                                            {t.l}
                                        </button>
                                    ))}
                                </div>
                                <textarea value={impactValue} onChange={e => setImpactValue(e.target.value)} rows={4}
                                    placeholder={impactType === 'metric' ? '예: 달리기 5km → 6km으로 향상, 처리 시간 2시간 → 45분 단축' : impactType === 'feedback' ? '예: 팀장님 "이번 보고서 정말 완성도 높았어"' : '예: GitHub 링크, 발표 자료 URL, 완성된 작품 설명'}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-border dark:border-gray-800 bg-surface text-sm focus:outline-none focus:border-brand-400 dark:text-gray-100 resize-none transition-all" />
                            </div>
                        )}

                        {/* Competency Tab */}
                        {enrichmentTab === 'competency' && (
                            <div className="space-y-4 relative">
                                {isTutorial && (
                                    <TutorialBubble text="체크리스트를 선택하면\n추가 경험치(XP)를\n얻을 수 있어요!" pointer="bottom" className="top-8 left-1/2 -translate-x-1/2 z-50 mb-4" />
                                )}
                                <p className="text-xs text-gray-400 transition-colors">이 경험과 관련된 역량을 1~3개 골라 체크리스트에 답해보세요</p>
                                {COMPETENCIES.map(comp => {
                                    const draft = competencyDrafts.find(d => d.key === comp.key);
                                    const isSelected = !!draft;
                                    return (
                                        <div key={comp.key} className={`enrichment-comp-card rounded-2xl border-2 overflow-hidden transition-all ${isSelected ? 'border-brand-300 bg-brand-50 is-selected' : 'border-border bg-surface-2'}`}>
                                            <button onClick={() => {
                                                if (isSelected) { setCompetencyDrafts(d => d.filter(x => x.key !== comp.key)); }
                                                else if (competencyDrafts.length < 3) { setCompetencyDrafts(d => [...d, { key: comp.key, checked: {} }]); }
                                            }} className="w-full flex items-center gap-3 p-3 text-left transition-colors">
                                                <span className="text-xl">{comp.icon}</span>
                                                <div className="flex-1">
                                                    <p className="enrichment-comp-label font-semibold text-sm text-gray-900 transition-colors">{comp.label}</p>
                                                    <p className="enrichment-comp-desc text-xs text-gray-400 transition-colors">{comp.description}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'}`}>
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
                                                            }} className="flex items-center gap-3 w-full text-left transition-colors">
                                                                {checked ? <CheckSquare size={18} className="text-brand-500 flex-shrink-0" /> : <Square size={18} className="enrichment-comp-check text-gray-300 flex-shrink-0 transition-colors" />}
                                                                <span className="enrichment-comp-item text-sm text-gray-700 transition-colors">{ci.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                    {(() => {
                                                        const cnt = Object.values(draft.checked).filter(Boolean).length;
                                                        const lvl = calcCompetencyLevel(cnt);
                                                        const anchor = COMPETENCIES.find(c => c.key === comp.key)?.anchors[lvl];
                                                        return <p className="enrichment-comp-anchor text-xs font-bold text-brand-600 mt-2">레벨 {lvl}: {anchor}</p>;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Skill Selection Tab */}
                        {enrichmentTab === 'skill' && (
                            <div className="space-y-5 animate-fade-in pb-4">
                                <div className="space-y-1.5 px-1 mt-1">
                                    <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-200">🛠️ 활용한 기술 및 도구</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">이 경험에서 발휘된 핵심 스킬을 태그해두면 나중에 나만의 전문 기술 스택 자산이 됩니다.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {SKILLS.map(skill => {
                                        const isSelected = selectedSkills.includes(skill.key);
                                        return (
                                            <button
                                                key={skill.key}
                                                onClick={() => setSelectedSkills(prev => 
                                                    isSelected ? prev.filter(s => s !== skill.key) : [...prev, skill.key]
                                                )}
                                                className={cn(
                                                    "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 border-2",
                                                    isSelected 
                                                    ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20 scale-105" 
                                                    : "bg-surface border-border text-gray-500 dark:text-gray-400 hover:border-brand-200 dark:hover:border-brand-900"
                                                )}
                                            >
                                                {skill.name_ko}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-5 pb-8 pt-3 border-t border-border bg-surface transition-colors space-y-3">
                        <Button fullWidth size="lg" loading={enrichSaving} onClick={handleEnrichmentSave}>저장하고 완료! 🎉</Button>
                        <Button fullWidth variant="secondary" onClick={async () => { await checkAndAwardBadges(user!.id, earnedStreak, finalAnswers, 0); setXpResult({ base: 20, bonus: 0, total: 20, breakdown: [], trustLabel: 'self' }); await refreshProgress(); setStage('completed'); }}>강화 없이 완료</Button>
                    </div>
                </div>
            )}

            {/* ── Completed ── */}
            {stage === 'completed' && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center overflow-y-auto bg-surface transition-colors">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 transition-colors">성공적으로 기록되었습니다!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 transition-colors">나의 소중한 경험이 변치 않는 자산으로 쌓였습니다.</p>

                    {isTutorial && (
                        <TutorialBubble text="축하합니다! 첫 기록을 무사히 마쳤네요.\n이제 홈 화면에서 나의 성장을 확인해보세요!" pointer="bottom" className="bottom-full mb-4 left-1/2 -translate-x-1/2 z-50" />
                    )}

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

                    {/* Quality Bar (New) */}
                    {xpResult && (
                        <div className="bg-surface-2 dark:bg-gray-800/50 rounded-2xl p-4 mb-4 w-full border border-border transition-colors animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-brand-500">💎</span>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">기록 완성도</span>
                                </div>
                                <span className="text-sm font-extrabold text-brand-600">{calcQualityScore({
                                    answerCount: finalAnswers.length,
                                    totalLength: finalAnswers.reduce((s, a) => s + a.answer.length, 0),
                                    imageCount: imageFile ? 1 : 0,
                                    evidenceCount: proofDrafts.filter(p => p.url.trim() !== '').length,
                                    hasImpact: impactValue.trim().length > 0,
                                    competencyCount: competencyDrafts.length
                                })}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${calcQualityScore({
                                        answerCount: finalAnswers.length,
                                        totalLength: finalAnswers.reduce((s, a) => s + a.answer.length, 0),
                                        imageCount: imageFile ? 1 : 0,
                                        evidenceCount: proofDrafts.filter(p => p.url.trim() !== '').length,
                                        hasImpact: impactValue.trim().length > 0,
                                        competencyCount: competencyDrafts.length
                                    })}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">더 꼼꼼하게 채울수록 실무 활용도가 높아져요!</p>
                        </div>
                    )}

                    {/* trust 배지 */}
                    {xpResult && (
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 shadow-sm border border-black/5 ${trustInfo.bg}`}>
                            <span>{trustInfo.icon}</span>
                            <span className={`text-sm font-bold ${trustInfo.color}`}>신뢰도 {trustInfo.label}</span>
                        </div>
                    )}

                    <div className="flex gap-3 mb-5 w-full">
                        <div className="flex-1 flex flex-col items-center gap-1 bg-orange-50 dark:bg-orange-950/20 rounded-2xl p-4 transition-colors">
                            <span className="text-2xl">🔥</span>
                            <span className="font-bold text-orange-500 text-sm">{earnedStreak}일 스트릭</span>
                        </div>
                        {earnedGrowthStreak > 0 && (
                            <div className="flex-1 flex flex-col items-center gap-1 bg-green-50 dark:bg-green-950/20 rounded-2xl p-4 transition-colors">
                                <span className="text-2xl">🌿</span>
                                <span className="font-bold text-green-600 text-sm">성장 {earnedGrowthStreak}일</span>
                            </div>
                        )}
                    </div>

                    {newBadges.length > 0 && (
                        <div className="bg-brand-50 dark:bg-brand-950/20 rounded-2xl p-5 mb-5 w-full border border-brand-100 dark:border-brand-900/40 transition-colors">
                            <p className="font-bold text-brand-700 dark:text-brand-300 mb-3 transition-colors">🏅 새 배지 획득!</p>
                            {newBadges.map(b => (
                                <div key={b.id} className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{b.icon}</span>
                                    <div className="text-left"><p className="font-bold text-brand-700 dark:text-brand-300 text-sm transition-colors">{b.name}</p><p className="text-brand-500 dark:text-brand-400 text-xs transition-colors">{b.description}</p></div>
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
