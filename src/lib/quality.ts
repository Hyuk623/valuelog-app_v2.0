export interface QualityScoreParams {
    answerCount: number;
    totalLength: number; // 추가: 답변 총 글자 수
    imageCount: number;
    evidenceCount: number;
    hasImpact: boolean;
    competencyCount: number;
}

/**
 * 경험 기록의 활용도(Quality/Completeness) 점수를 계산합니다.
 * 신뢰성(Trust)과는 달리, 나중에 내가 자산으로 써먹기 얼마나 좋게 구성되어 있는가를 측정합니다.
 * Max: 100
 */
export function calcQualityScore(params: QualityScoreParams): number {
    // 1. 최소 시작 점수 (기록이 존재함 자체로 30점 부여)
    let score = 30; 

    // 2. 작성한 답변 개수 (최대 20) - 항목당 5점
    score += Math.min(20, params.answerCount * 5);

    // 3. 기록의 정성 정도 (글자 수 보너스: 총 200자 이상 시 20점 만점)
    const lengthBonus = Math.min(20, Math.floor(params.totalLength / 10)); 
    score += lengthBonus;

    // 4. 사진 유무 (5)
    if (params.imageCount > 0) score += 5;

    // 5. 증빙 링크 유무 (5)
    if (params.evidenceCount > 0) score += 5;

    // 6. 성과 수치화 유무 (10)
    if (params.hasImpact) score += 10;

    // 7. 역량 태깅 유무 (10)
    if (params.competencyCount > 0) score += 10;

    return Math.min(100, score);
}

/**
 * 활용성을 높이기 위한 부드러운 가이드/팁을 제공합니다.
 */
export function getQualityImprovementTips(params: QualityScoreParams): string[] {
    const tips: string[] = [];
    
    if (!params.hasImpact) {
        tips.push('📈 결과나 수치를 한 줄 덧붙이면 나중에 이력서에 바로 쓸 수 있어요.');
    }
    if (params.evidenceCount === 0) {
        tips.push('🔗 증빙 링크를 남겨두면 나중에 증명하기 편해요.');
    }
    if (params.competencyCount === 0) {
        tips.push('💡 어떤 역량을 발휘했는지 체크해두면 강점 분석에 도움이 돼요.');
    }
    if (params.imageCount === 0) {
        tips.push('📸 사진을 한 장 추가하면 훨씬 생생한 포트폴리오가 돼요.');
    }

    return tips;
}
