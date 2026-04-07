import { Experience, ExperienceAnswer, ExperienceCompetency, CATEGORIES } from '@/types';

interface TemplateContext {
    exp: Experience;
    answers: ExperienceAnswer[];
    competencies: ExperienceCompetency[];
}

// 텍스트 정제 헬퍼: 마침표 제거 및 끝맺음 처리
const clean = (text: string) => text.trim().replace(/\.$/, '');

/**
 * 룰 기반 템플릿 생성기
 */
export const AssetTemplates = {
    // 1. 자기소개 요약 초안 (세련된 비즈니스 문장 위주)
    generateOneLiner: ({ exp, competencies }: TemplateContext): string => {
        const catLabel = CATEGORIES[exp.category]?.label || '관련';
        const impact = clean(exp.impact_signal?.value || '성공적인 과제 수행');
        const primaryComp = competencies[0]?.anchor_text || '전문성';
        
        // 중복 방지 및 문맥 조합
        const templates = [
            `"${primaryComp} 역량을 발휘하여 ${catLabel} 활동 중 ${impact}이라는 유의미한 결과를 만들어냈습니다."`,
            `"${catLabel} 분야에서 ${primaryComp}을(를) 바탕으로 ${impact} 성과를 달성하며 성장한 경험이 있습니다."`,
            `"${impact} 성과를 이끌어낸 ${primaryComp} 중심의 ${catLabel} 프로젝트 경험을 보유하고 있습니다."`
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    },

    // 2. 면접 답변 초안 (STARR 구조화 기반 — 문장 간 연결성 강화)
    generateInterview: ({ exp, answers }: TemplateContext): string => {
        const getAns = (key: string) => clean(answers.find(a => a.step_key === key)?.answer || '');
        
        const situation = getAns('situation') || getAns('topic') || getAns('activity') || '당시 과업을 진행하던';
        const task = getAns('task') || getAns('goal') || '주어진 목표 달성';
        const action = getAns('action') || getAns('process') || '필요한 조치';
        const result = getAns('result') || getAns('achieved') || exp.impact_signal?.value || '기대했던 성과';
        const learned = getAns('learned') || getAns('takeaway') || '가치 있는 교훈';

        return `[면접용 경험 기술 상세 초안]

당시 저는 ${situation} 상황에 놓여 있었고, 이를 통해 ${task}이라는 구체적인 목표를 달성해야 했습니다.

이 문제를 해결하기 위해 제가 집중한 핵심 행동은 ${action} 부분이었습니다. 단순히 과업을 수행하는 것에 그치지 않고 주도적으로 실행에 옮겼습니다.

그 결과, 결과적으로 ${result} 결과를 얻을 수 있었습니다. 이 과정에서 얻은 ${learned}이라는 깨달음은 앞으로의 업무 수행에서도 중요한 자산이 될 것입니다.`;
    },

    // 3. 포트폴리오 요약 카드 (상세 텍스트 — 깔끔한 불렛 포인트)
    generatePortfolio: ({ exp, competencies }: TemplateContext): string => {
        const catIcon = CATEGORIES[exp.category]?.icon || '✨';
        const catLabel = CATEGORIES[exp.category]?.label || '프로젝트';
        const impact = exp.impact_signal ? `핵심 성과: ${clean(exp.impact_signal.value)}` : '핵심 성과: 목표 활동 및 기록 완료';
        const comps = competencies.length > 0 ? `발휘 역량: ${competencies.map(c => clean(c.anchor_text)).join(', ')}` : '';
        
        return `${catIcon} [${catLabel}] ${exp.title}
- 활동 일자: ${exp.local_date}
- ${impact}
- ${comps}
- 경험 상세: ${clean(exp.summary || (exp.structured ? Object.values(exp.structured).join(' ') : '기록된 내용이 없습니다.'))}`;
    },

    // 4. 경력기술형 짧은 문장 (실무 중심)
    generateCareerDescription: ({ exp, competencies }: TemplateContext): string => {
        const catLabel = CATEGORIES[exp.category]?.label || '프로젝트';
        const impact = clean(exp.impact_signal?.value || '과업 완수');
        const primaryComp = clean(competencies[0]?.anchor_text || '핵심 역량');
        
        return `[${catLabel}] ${exp.title} (${exp.local_date})
• 주요 역할: ${primaryComp} 강점을 활용한 활동 수행
• 핵심 성과: ${impact} 달성 및 경험 데이터 기반 프로세스 정리`;
    }
};
