// =====================
// Database Types (v2)
// =====================

export interface Profile {
    user_id: string;
    display_name: string;
    timezone: string;
    weekly_goal: number;
    interests: string[];
    created_at: string;
}

export interface PromptStep {
    key: string;
    question: string;
    placeholder: string;
    guide?: string;       // 💡 힌트/안내 문구
    examples?: string[];  // 탭하면 자동 추가되는 예시 칩
    required: boolean;
    order: number;
    type?: 'text' | 'textarea';
}

export interface PromptSet {
    id: string;
    category: string;
    title: string;
    steps: PromptStep[];
    is_active: boolean;
    icon?: string;
}

export interface Experience {
    id: string;
    user_id: string;
    local_date: string;
    category: string;
    title: string;
    summary: string | null;
    structured: Record<string, string> | null;
    xp_earned: number;
    image_urls: string[];
    // v2.2
    impact_signal: { type: 'metric' | 'feedback' | 'artifact'; value: string } | null;
    quality_score: number;
    // v2.3
    trust_label: 'self' | 'evidence' | 'peer' | 'issuer';
    trust_score: number;
    growth_index: number | null;
    created_at: string;
    updated_at: string;
}

export interface EvidenceItem {
    id: string;
    experience_id: string;
    type: 'url';
    url: string;
    title: string | null;
    note: string | null;
    created_at: string;
}

export interface ExperienceCompetency {
    id: string;
    experience_id: string;
    competency_key: string;
    rubric_version: number;
    checklist_snapshot: { key: string; label: string; checked: boolean }[];
    checked_count: number;
    level: number;
    anchor_text: string;
    created_at: string;
}

export interface Skill {
    key: string;
    name_ko: string;
    description: string | null;
    is_active: boolean;
}

export interface ExperienceSkill {
    id: string;
    experience_id: string;
    skill_key: string;
    created_at: string;
}

export interface ExperienceAnswer {
    id: string;
    experience_id: string;
    step_key: string;
    answer: string;
    created_at: string;
}

export interface DailyProgress {
    user_id: string;
    local_date: string;
    completed: boolean;
    xp_total: number;
    streak_count: number;
    last_completed_date: string | null;
    // v2.2 성장 스트릭
    growth_completed: boolean;
    growth_streak_count: number;
    last_growth_completed_date: string | null;
}

export interface BadgeCriteria {
    type: 'streak' | 'total_experiences' | 'category_count' | 'total_xp' | 'writing_depth' | 'category_diversity';
    value: number;
    category?: string;
}

export interface Badge {
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    criteria: BadgeCriteria;
}

export interface UserBadge {
    user_id: string;
    badge_id: string;
    earned_at: string;
    badge?: Badge;
}

// =====================
// App State Types
// =====================

export interface QuestAnswer {
    step_key: string;
    answer: string;
}

export type QuestStatus = 'idle' | 'selecting' | 'in_progress' | 'completed';

export interface NewlyEarnedBadge extends Badge {
    newly_earned: boolean;
}

// =====================
// Category Definitions (9개)
// =====================
export const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
    exercise: { label: '운동/건강', icon: '🏃', color: '#4ade80' },
    study: { label: '학습/독서', icon: '📚', color: '#60a5fa' },
    experience: { label: '견학/체험', icon: '🗺️', color: '#06b6d4' },
    work: { label: '업무/일', icon: '💼', color: '#a78bfa' },
    project: { label: '프로젝트', icon: '🚀', color: '#f97316' },
    social: { label: '사람/관계', icon: '👥', color: '#ec4899' },
    creative: { label: '창작/취미', icon: '🎨', color: '#8b5cf6' },
    volunteer: { label: '봉사/나눔', icon: '🤝', color: '#f43f5e' },
    daily: { label: '일상/기타', icon: '✨', color: '#fbbf24' },
};

export type CategoryKey = keyof typeof CATEGORIES;

// XP per quest completion
export const XP_PER_QUEST = 20;

export const CATEGORY_TITLES: Record<string, string> = {
    exercise: '체육인',
    study: '학자',
    experience: '탐험가',
    work: '프로페셔널',
    project: '메이커',
    social: '마당발',
    creative: '아티스트',
    volunteer: '천사',
    daily: '기록자',
};

// Level thresholds
export function getLevelFromXP(xp: number, dominantCategory?: string | null): { level: number; label: string; nextXP: number; currentXP: number } {
    const thresholds = [0, 100, 250, 500, 1000, 1800, 3000, 5000];
    const adjectives = ['새싹', '루키', '성실한', '열정적인', '도전하는', '노련한', '마스터', '전설의'];

    let level = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (xp >= thresholds[i]) { level = i; break; }
    }

    const adjective = adjectives[level] ?? '전설의';
    const noun = dominantCategory ? (CATEGORY_TITLES[dominantCategory] ?? '기록자') : '기록자';
    const label = `${adjective} ${noun}`;

    return {
        level: level + 1,
        label,
        nextXP: thresholds[level + 1] ?? thresholds[thresholds.length - 1],
        currentXP: thresholds[level] ?? 0,
    };
}

// Local date helper (KST)
export function getLocalDateKST(): string {
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return kst.toISOString().split('T')[0]!;
}
