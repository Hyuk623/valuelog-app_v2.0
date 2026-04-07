-- ============================================================
-- ValueLog v2.5 Patch — Backfill Quality Score (v2 logic)
-- ============================================================

-- Trust Score는 객관적 신뢰성이라면, 
-- Quality Score는 기록의 "활용성과 완성도"를 나타냅니다.
-- v2 logic: 기본 30점 + 답변 개수(20) + 글자 수 보너스(20) + 외부요소(30)

UPDATE public.experiences e
SET quality_score = LEAST(100, 
    30 + 
    LEAST(20, (SELECT count(*) FROM public.experience_answers a WHERE a.experience_id = e.id) * 5) +
    LEAST(20, (SELECT COALESCE(SUM(LENGTH(answer)), 0) / 10 FROM public.experience_answers a WHERE a.experience_id = e.id)) +
    CASE WHEN cardinality(image_urls) > 0 THEN 5 ELSE 0 END +
    CASE WHEN (SELECT count(*) FROM public.evidence_items ev WHERE ev.experience_id = e.id) > 0 THEN 5 ELSE 0 END +
    CASE WHEN impact_signal IS NOT NULL THEN 10 ELSE 0 END +
    CASE WHEN (SELECT count(*) FROM public.experience_competencies c WHERE c.experience_id = e.id) > 0 THEN 10 ELSE 0 END
);
