import { Experience, ExperienceAnswer, ExperienceCompetency, CATEGORIES } from '@/types';

interface TemplateContext {
    exp: Experience;
    answers: ExperienceAnswer[];
    competencies: ExperienceCompetency[];
}

/**
 * 룰 기반 템플릿 생성기
 */
export const AssetTemplates = {
    // 1. 자기소개 한 줄 초안 (One-liner)
    generateOneLiner: ({ exp, competencies }: TemplateContext): string => {
        const catLabel = CATEGORIES[exp.category]?.label || '경험';
        const primaryComp = competencies[0]?.anchor_text.replace(/\.$/, '') || '역량';
        const impact = exp.impact_signal?.value || '성과를 창출함';

        return `"${primaryComp} 기술을 바탕으로, ${catLabel} 분야에서 ${impact} 성과를 만들어낸 경험이 있습니다."`;
    },

    // 2. 면접 답변 초안 (STARR 구조화)
    generateInterview: ({ exp, answers }: TemplateContext): string => {
        const getAns = (key: string) => answers.find(a => a.step_key === key)?.answer || '';
        
        // 카테고리별 매핑 (study -> 상황/과제, daily -> 경험 등)
        const situation = getAns('situation') || getAns('topic') || getAns('activity') || '활동 당시';
        const task = getAns('task') || getAns('goal') || '수행 목표';
        const action = getAns('action') || getAns('process') || '핵심 행동';
        const result = getAns('result') || getAns('achieved') || exp.impact_signal?.value || '결과';
        const learned = getAns('learned') || getAns('takeaway') || '배운 점';

        return `[질문: 해당 경험에 대해 구체적으로 말씀해 주세요]
        
본인은 ${situation} 상황에서 ${task}(이)라는 목표를 달성하고자 했습니다.
이를 위해 구체적으로 ${action}(와)과 같은 노력을 기울였습니다.
그 결과 ${result}(이)라는 성과를 얻을 수 있었습니다.
이 과정에서 ${learned}(으)로 표현되는 성찰을 통해 성장했습니다.`;
    },

    // 3. 포트폴리오 카드 (Bullet points)
    generatePortfolio: ({ exp, competencies }: TemplateContext): string => {
        const catIcon = CATEGORIES[exp.category]?.icon || '✨';
        const catLabel = CATEGORIES[exp.category]?.label || '기타';
        const impact = exp.impact_signal ? `✅ 핵심성과: ${exp.impact_signal.value}` : '';
        const comps = competencies.length > 0 ? `💡 태깅역량: ${competencies.map(c => c.anchor_text).join(', ')}` : '';
        
        return `${catIcon} [${catLabel}] ${exp.title}
- 기간/일시: ${exp.local_date}
${impact ? '- ' + impact : ''}
${comps ? '- ' + comps : ''}
- 상세: ${exp.summary || (exp.structured ? Object.values(exp.structured)[0] : '내용 없음')}`;
    }
};
