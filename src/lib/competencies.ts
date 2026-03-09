// ============================================================
// 역량(Competency) 상수 정의
// - 8개 역량, 각 5개 체크 항목, 레벨별 앵커 문장
// - 추후 DB 화 가능하도록 동일 구조로 설계
// - STARR 용어 UI 노출 없음 (내부 key만 영어)
// ============================================================

export interface CompetencyCheckItem {
    key: string;
    label: string; // 한국어, 사용자에게 표시
}

export interface CompetencyDefinition {
    key: string;
    label: string;       // 한국어 역량명
    icon: string;
    description: string; // 짧은 설명
    checkItems: CompetencyCheckItem[];
    anchors: Record<number, string>; // level 1~5 → 앵커 문장
}

export const COMPETENCIES: CompetencyDefinition[] = [
    {
        key: 'problem_solving',
        label: '문제해결',
        icon: '🧩',
        description: '문제를 정의하고 해결하는 능력',
        checkItems: [
            { key: 'defined_problem', label: '해결해야 할 문제를 명확히 파악했다' },
            { key: 'multiple_options', label: '2가지 이상 해결 방법을 생각해봤다' },
            { key: 'chose_reason', label: '선택한 이유를 설명할 수 있다' },
            { key: 'acted', label: '실제로 행동에 옮겼다' },
            { key: 'result_confirmed', label: '결과가 어떻게 됐는지 확인했다' },
        ],
        anchors: {
            1: '문제가 있다는 것을 인식했다',
            2: '혼자 해결을 시도했다',
            3: '원인을 분석하고 방법을 선택했다',
            4: '다양한 관점으로 접근하고 실행했다',
            5: '체계적으로 해결하고 결과까지 검증했다',
        },
    },
    {
        key: 'communication',
        label: '소통',
        icon: '💬',
        description: '생각을 전달하고 경청하는 능력',
        checkItems: [
            { key: 'listened', label: '상대의 말을 끝까지 들었다' },
            { key: 'expressed_clear', label: '내 생각을 명확하게 표현했다' },
            { key: 'asked_question', label: '이해를 위해 질문했다' },
            { key: 'received_feedback', label: '피드백을 수용했다' },
            { key: 'adjusted', label: '대화에 따라 방식을 조정했다' },
        ],
        anchors: {
            1: '상황을 다른 사람에게 전달했다',
            2: '상대방의 말을 듣고 반응했다',
            3: '근거를 들어 내 생각을 표현했다',
            4: '피드백을 수용하며 소통을 개선했다',
            5: '상황에 맞게 소통 방식을 유연하게 조절했다',
        },
    },
    {
        key: 'execution',
        label: '실행력',
        icon: '⚡',
        description: '계획을 실제로 해내는 능력',
        checkItems: [
            { key: 'started', label: '미루지 않고 시작했다' },
            { key: 'kept_going', label: '어려움이 있어도 계속했다' },
            { key: 'met_deadline', label: '목표 시간/기한을 지켰다' },
            { key: 'quality_check', label: '결과물의 질을 확인했다' },
            { key: 'completed', label: '완료까지 마무리했다' },
        ],
        anchors: {
            1: '시작을 했다',
            2: '중간에 포기하지 않았다',
            3: '기한 내에 완료했다',
            4: '질을 확인하며 완성도 있게 마쳤다',
            5: '어려움에도 높은 완성도로 마무리했다',
        },
    },
    {
        key: 'learning',
        label: '학습력',
        icon: '📖',
        description: '새로운 것을 배우고 적용하는 능력',
        checkItems: [
            { key: 'new_info', label: '새로운 정보나 개념을 접했다' },
            { key: 'understood', label: '이해했다고 확신할 수 있다' },
            { key: 'connected', label: '기존 지식과 연결했다' },
            { key: 'applied', label: '실제로 적용해봤다' },
            { key: 'taught_others', label: '다른 사람에게 설명할 수 있다' },
        ],
        anchors: {
            1: '새로운 것을 접했다',
            2: '내용을 이해했다',
            3: '기존 것과 연결해서 이해했다',
            4: '실제로 적용해봤다',
            5: '배운 것을 다른 사람에게 설명할 수 있다',
        },
    },
    {
        key: 'collaboration',
        label: '협업',
        icon: '🤝',
        description: '팀과 함께 목표를 달성하는 능력',
        checkItems: [
            { key: 'shared_goal', label: '공동 목표를 이해하고 있었다' },
            { key: 'role_clear', label: '내 역할을 분명히 했다' },
            { key: 'supported', label: '팀원을 도왔다' },
            { key: 'communicated', label: '진행 상황을 공유했다' },
            { key: 'conflict_handled', label: '의견 차이를 건설적으로 해결했다' },
        ],
        anchors: {
            1: '팀 활동에 참여했다',
            2: '내 역할을 수행했다',
            3: '팀원과 적극적으로 소통했다',
            4: '팀 전체의 성과에 기여했다',
            5: '팀 시너지를 이끌어냈다',
        },
    },
    {
        key: 'ownership',
        label: '주도성',
        icon: '🎯',
        description: '자발적으로 책임지고 이끄는 능력',
        checkItems: [
            { key: 'initiated', label: '누가 시키지 않아도 먼저 시작했다' },
            { key: 'took_responsibility', label: '결과에 대해 책임을 졌다' },
            { key: 'improved', label: '더 나아지게 하려 노력했다' },
            { key: 'led_others', label: '다른 사람을 이끌었다' },
            { key: 'persisted', label: '방해 요소가 있어도 포기하지 않았다' },
        ],
        anchors: {
            1: '주어진 일을 했다',
            2: '자발적으로 참여했다',
            3: '결과에 책임감을 갖고 개선했다',
            4: '주도적으로 문제를 해결하고 이끌었다',
            5: '조직/팀에 긍정적 변화를 만들어냈다',
        },
    },
    {
        key: 'planning',
        label: '계획력',
        icon: '📋',
        description: '목표를 세우고 체계적으로 준비하는 능력',
        checkItems: [
            { key: 'goal_set', label: '명확한 목표를 세웠다' },
            { key: 'steps_planned', label: '단계적 계획을 세웠다' },
            { key: 'resources_ready', label: '필요한 자원을 미리 준비했다' },
            { key: 'adjusted_plan', label: '상황에 따라 계획을 조정했다' },
            { key: 'reviewed', label: '계획 대비 결과를 돌아봤다' },
        ],
        anchors: {
            1: '무엇을 할지 정했다',
            2: '단계를 나누어 계획했다',
            3: '자원을 준비하고 계획을 실행했다',
            4: '변화에 맞게 계획을 유연하게 조정했다',
            5: '체계적 계획으로 높은 성과를 이끌었다',
        },
    },
    {
        key: 'reflection',
        label: '성찰',
        icon: '🔍',
        description: '경험을 되돌아보고 성장으로 연결하는 능력',
        checkItems: [
            { key: 'looked_back', label: '경험을 돌아봤다' },
            { key: 'found_lesson', label: '배운 점을 발견했다' },
            { key: 'found_improve', label: '개선할 점을 찾았다' },
            { key: 'connected_future', label: '다음에 어떻게 적용할지 생각했다' },
            { key: 'shared_insight', label: '인사이트를 다른 사람과 나눴다' },
        ],
        anchors: {
            1: '경험을 기록했다',
            2: '잘된 점과 아쉬운 점을 찾았다',
            3: '배운 점을 정리했다',
            4: '다음 행동까지 연결해 생각했다',
            5: '인사이트를 다른 사람에게도 나눴다',
        },
    },
];

// competency_key → definition 빠른 조회
export const COMPETENCY_MAP: Record<string, CompetencyDefinition> = Object.fromEntries(
    COMPETENCIES.map(c => [c.key, c])
);

// checkedCount → level 계산 (0→1, 1→1, 2→2, 3→3, 4→4, 5→5)
export function calcCompetencyLevel(checkedCount: number): number {
    if (checkedCount === 0) return 1;
    return Math.min(5, checkedCount);
}

// trust 계산 룰 (v2.3)
export interface TrustInput {
    hasProofUrl: boolean;
    hasImpactSignal: boolean;
    hasCompetency: boolean;
    hasPeerReview?: boolean;
    hasIssuerReview?: boolean;
}

export function calcTrust(input: TrustInput): { score: number; label: 'self' | 'evidence' | 'peer' | 'issuer' } {
    let score = 0;
    if (input.hasProofUrl) score += 30;
    if (input.hasImpactSignal) score += 40;
    if (input.hasCompetency) score += 20;
    if (input.hasPeerReview) score += 20;
    if (input.hasIssuerReview) score += 40;

    let label: 'self' | 'evidence' | 'peer' | 'issuer' = 'self';
    if (input.hasIssuerReview) {
        label = 'issuer';
    } else if (input.hasPeerReview) {
        label = 'peer';
    } else if (score >= 30) {
        label = 'evidence';
    }

    return { score, label };
}

export const TRUST_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    self: { label: 'Self', color: 'text-gray-500', bg: 'bg-gray-100', icon: '📝' },
    evidence: { label: 'Evidence', color: 'text-blue-600', bg: 'bg-blue-50', icon: '🔖' },
    peer: { label: 'Peer', color: 'text-purple-600', bg: 'bg-purple-50', icon: '👥' },
    issuer: { label: 'Issuer', color: 'text-green-600', bg: 'bg-green-50', icon: '🏛️' },
};

// XP bonus 계산
export interface XPBonusInput {
    hasCompetency: boolean;
    hasImpactSignal: boolean;
    hasProofUrl: boolean;
    trustLabel: 'self' | 'evidence' | 'peer' | 'issuer';
}

export const BASE_XP = 20;

export function calcXPBonus(input: XPBonusInput): { base: number; bonus: number; total: number; breakdown: string[] } {
    let bonus = 0;
    const breakdown: string[] = [];
    if (input.hasCompetency) { bonus += 5; breakdown.push('역량 체크 +5'); }
    if (input.hasImpactSignal) { bonus += 10; breakdown.push('성과/수치 기록 +10'); }
    if (input.hasProofUrl) { bonus += 10; breakdown.push('증빙 링크 +10'); }
    if (input.trustLabel === 'evidence' || input.trustLabel === 'peer' || input.trustLabel === 'issuer') {
        bonus += 10; breakdown.push('증거 달성 +10');
    }
    return { base: BASE_XP, bonus, total: BASE_XP + bonus, breakdown };
}

// ============================================================
// Career Persona Logic (Lightweight MVP)
// ============================================================

export interface Persona {
    id: string;
    icon: string;
    name: string;
    message: string;
    action: string;
}

const PERSONAS: Persona[] = [
    {
        id: 'creator',
        icon: '💡',
        name: '혁신적인 크리에이터',
        message: '새로운 아이디어를 내고 무언가를 만들어내는 과정에서 가장 큰 성취감을 느낍니다. 창의성과 문제해결력이 특히 돋보이네요!',
        action: '아이디어를 현실로 구현하는 기획자, 개발자, 디자이너 직무에 잘 어울려요.',
    },
    {
        id: 'strategist',
        icon: '♟️',
        name: '논리적인 전략가',
        message: '현상을 비판적으로 바라보고, 학습과 분석을 통해 최적의 결정을 내리는 것에 능숙합니다. 계획성과 학습력이 강점입니다.',
        action: '데이터 기반으로 문제를 푸는 마케터, 비즈니스 분석가, 연구원 직무를 추천해요.',
    },
    {
        id: 'leader',
        icon: '🤝',
        name: '따뜻한 리더/커뮤니케이터',
        message: '사람들과 소통하고 협력하여 공동의 목표를 달성할 때 빛이 납니다. 팀워크와 타인을 돕는 봉사 정신이 탁월해요.',
        action: '사람의 마음을 움직이는 세일즈, HR 담당자, 교육자 직무에 잠재력이 큽니다.',
    },
    {
        id: 'doer',
        icon: '🔥',
        name: '행동하는 실천가',
        message: '탁상공론보다는 직접 부딪혀 경험하며 결과를 만들어내는 타입입니다. 강한 실행력과 주도성이 가장 큰 무기입니다.',
        action: '밑바닥부터 성과를 일궈내는 창업가, 현장 관리자, 프로젝트 매니저에 제격이에요.',
    }
];

export function getPersona(categories: string[], competencies: string[]): Persona {
    let scores = { creator: 0, strategist: 0, leader: 0, doer: 0 };

    // 가중치 계산
    categories.forEach(cat => {
        if (cat === 'creative' || cat === 'project') scores.creator += 2;
        if (cat === 'study' || cat === 'work') scores.strategist += 2;
        if (cat === 'social' || cat === 'volunteer') scores.leader += 2;
        if (cat === 'exercise' || cat === 'experience') scores.doer += 2;
    });

    competencies.forEach(comp => {
        if (comp === 'problem_solving') scores.creator += 2;
        if (comp === 'planning' || comp === 'learning') scores.strategist += 2;
        if (comp === 'communication' || comp === 'collaboration') scores.leader += 2;
        if (comp === 'execution' || comp === 'ownership') scores.doer += 2;
    });

    // 최고 점수 페르소나 찾기, 동점일 경우 creator 기본값
    let maxScore = -1;
    let topId = 'creator';

    for (const [id, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            topId = id;
        }
    }

    return PERSONAS.find(p => p.id === topId) || PERSONAS[0];
}
