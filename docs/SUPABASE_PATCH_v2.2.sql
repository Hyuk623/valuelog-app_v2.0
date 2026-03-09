-- ============================================================
-- ValueLog v2.2 — 안전 패치 (기존 DB에 추가 실행)
-- 
-- 이 파일만 실행하면 됩니다.
-- 멱등(idempotent): 여러 번 실행해도 안전합니다.
-- Supabase → SQL Editor에 전체 붙여넣고 Run
-- ============================================================

-- ============================================================
-- STEP 1. experiences 테이블 — v2.2 컬럼 추가
-- ============================================================
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS image_urls       text[]  NOT NULL DEFAULT '{}';
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS impact_signal    jsonb   NULL;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS confidence_score int     NOT NULL DEFAULT 0;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS confidence_level text    NOT NULL DEFAULT 'draft';
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS quality_score    int     NOT NULL DEFAULT 0;

-- ============================================================
-- STEP 2. 인덱스 추가 (컬럼 추가 후 생성)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_experiences_confidence ON public.experiences (user_id, confidence_level);

-- ============================================================
-- STEP 3. evidence_items 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  type          text NOT NULL DEFAULT 'url',
  url           text NOT NULL DEFAULT '',
  title         text,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_experience ON public.evidence_items (experience_id);

ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence: own read"   ON public.evidence_items;
DROP POLICY IF EXISTS "evidence: own insert" ON public.evidence_items;
DROP POLICY IF EXISTS "evidence: own update" ON public.evidence_items;
DROP POLICY IF EXISTS "evidence: own delete" ON public.evidence_items;
CREATE POLICY "evidence: own read"   ON public.evidence_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "evidence: own insert" ON public.evidence_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "evidence: own update" ON public.evidence_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "evidence: own delete" ON public.evidence_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));

-- ============================================================
-- STEP 4. experience_competencies 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.experience_competencies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id   uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  competency_key  text NOT NULL,
  checklist       jsonb NOT NULL DEFAULT '{"items":[],"checkedCount":0}',
  level           int  NOT NULL DEFAULT 1,
  anchor_text     text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_competency_experience ON public.experience_competencies (experience_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_competency_unique ON public.experience_competencies (experience_id, competency_key);

ALTER TABLE public.experience_competencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "competency: own read"   ON public.experience_competencies;
DROP POLICY IF EXISTS "competency: own insert" ON public.experience_competencies;
DROP POLICY IF EXISTS "competency: own update" ON public.experience_competencies;
DROP POLICY IF EXISTS "competency: own delete" ON public.experience_competencies;
CREATE POLICY "competency: own read"   ON public.experience_competencies FOR SELECT USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "competency: own insert" ON public.experience_competencies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "competency: own update" ON public.experience_competencies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "competency: own delete" ON public.experience_competencies FOR DELETE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));

-- ============================================================
-- STEP 5. daily_progress — 성장 스트릭 컬럼 추가
-- ============================================================
ALTER TABLE public.daily_progress ADD COLUMN IF NOT EXISTS growth_completed           boolean NOT NULL DEFAULT false;
ALTER TABLE public.daily_progress ADD COLUMN IF NOT EXISTS growth_streak_count        int     NOT NULL DEFAULT 0;
ALTER TABLE public.daily_progress ADD COLUMN IF NOT EXISTS last_growth_completed_date date;

-- ============================================================
-- STEP 6. Storage 버킷 (이미 있으면 무시)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'experience-images',
  'experience-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "images: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "images: public read"          ON storage.objects;
DROP POLICY IF EXISTS "images: own delete"           ON storage.objects;
CREATE POLICY "images: authenticated upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'experience-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "images: public read"          ON storage.objects FOR SELECT USING (bucket_id = 'experience-images');
CREATE POLICY "images: own delete"           ON storage.objects FOR DELETE USING (bucket_id = 'experience-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- STEP 7. 배지 추가 (이미 있으면 무시)
-- ============================================================
INSERT INTO public.badges (key, name, description, icon, criteria) VALUES
  ('first_quest',       '첫 퀘스트!',         '첫 번째 기록을 완료했어요',           '🌱', '{"type":"total_experiences","value":1}'),
  ('records_5',         '기록 5개',            '5개의 기록을 남겼어요',               '📝', '{"type":"total_experiences","value":5}'),
  ('records_10',        '기록 10개',           '총 10개의 기록을 남겼어요',           '📚', '{"type":"total_experiences","value":10}'),
  ('records_30',        '기록 30개',           '30개 기록! 꾸준함이 힘이에요',        '📖', '{"type":"total_experiences","value":30}'),
  ('records_50',        '기록 50개',           '50개! 진정한 기록왕이에요',           '🏆', '{"type":"total_experiences","value":50}'),
  ('streak_3',          '3일 연속',            '3일 연속 퀘스트 완료',                '🔥', '{"type":"streak","value":3}'),
  ('streak_7',          '일주일 연속',         '7일 연속! 대단해요',                  '🔥', '{"type":"streak","value":7}'),
  ('streak_14',         '2주 연속',            '2주 연속! 습관이 만들어지고 있어요',  '💪', '{"type":"streak","value":14}'),
  ('streak_30',         '한 달 연속',          '30일! 정말 대단한 끈기예요',          '💎', '{"type":"streak","value":30}'),
  ('xp_100',            '100 XP',              '경험치 100 달성',                     '⭐', '{"type":"total_xp","value":100}'),
  ('xp_500',            '500 XP',              '경험치 500! 성장을 느끼나요?',        '🌟', '{"type":"total_xp","value":500}'),
  ('xp_1000',           '1000 XP',             '경험치 1000! 진정한 성장인',          '💫', '{"type":"total_xp","value":1000}'),
  ('xp_3000',           '3000 XP',             '경험치 3000! 레전드',                 '🚀', '{"type":"total_xp","value":3000}'),
  ('deep_thinker',      '깊은 생각가',         '한 기록에 200자 이상 작성했어요',     '🧠', '{"type":"writing_depth","value":200}'),
  ('storyteller',       '스토리텔러',          '한 기록에 400자 이상 작성했어요',     '✍️', '{"type":"writing_depth","value":400}'),
  ('curious_mind',      '호기심 탐험가',       '3가지 카테고리를 기록했어요',         '🗺️', '{"type":"category_diversity","value":3}'),
  ('all_rounder',       '올라운더',            '5가지 이상 카테고리를 경험했어요',    '🌈', '{"type":"category_diversity","value":5}'),
  ('growth_streak_3',   '성장 3일 연속',       '3일 연속 증거 포함 기록!',            '🌿', '{"type":"growth_streak","value":3}'),
  ('growth_streak_7',   '성장 일주일 연속',    '7일 연속 증거 포함 기록!',            '🌳', '{"type":"growth_streak","value":7}'),
  ('evidence_10',       '증거 달인',           '증거 포함 기록 10건 달성',            '🔖', '{"type":"evidence_count","value":10}'),
  ('impact_5',          '임팩트 메이커',       '성과/수치 기록 5번 달성',             '📊', '{"type":"impact_signal_count","value":5}'),
  ('competency_4',      '역량 탐험가',         '4가지 역량을 기록에 활용했어요',      '💡', '{"type":"diversity_categories","value":4}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- STEP 8. prompt_sets 추가 (이미 있으면 무시)
-- ============================================================
INSERT INTO public.prompt_sets (category, title, steps) VALUES
  ('experience','견학/체험','[{"key":"what","question":"어떤 견학/체험을 했나요?","placeholder":"예: 박물관, 도예 체험, 여행","required":true,"order":0},{"key":"where","question":"어디서, 누구와 함께였나요?","placeholder":"장소, 동행인","required":true,"order":1},{"key":"highlight","question":"가장 인상 깊었던 순간은?","placeholder":"놀라운 사실이나 장면","required":true,"order":2},{"key":"takeaway","question":"이 경험에서 얻은 것은? (선택)","placeholder":"새로운 시각","required":false,"order":3}]'),
  ('social','사람/관계','[{"key":"who","question":"누구와 무엇을 했나요?","placeholder":"예: 친구들과 저녁","required":true,"order":0},{"key":"situation","question":"어떤 분위기였나요?","placeholder":"즐거웠나요?","required":true,"order":1},{"key":"highlight","question":"가장 기억에 남는 순간은?","placeholder":"인상 깊었던 대화나 에피소드","required":true,"order":2},{"key":"feeling","question":"만남 후 기분은? (선택)","placeholder":"어떤 감정으로 헤어졌나요?","required":false,"order":3}]'),
  ('creative','창작/취미','[{"key":"activity","question":"어떤 창작/취미 활동을 했나요?","placeholder":"예: 수채화, 기타 연습","required":true,"order":0},{"key":"process","question":"어떻게 진행했나요?","placeholder":"무엇을 만들었나요?","required":true,"order":1},{"key":"result","question":"결과물이나 성취는?","placeholder":"완성됐나요?","required":true,"order":2},{"key":"feeling","question":"활동하면서 느낀 점은? (선택)","placeholder":"즐거웠나요?","required":false,"order":3}]'),
  ('volunteer','봉사/나눔','[{"key":"activity","question":"어떤 봉사/나눔 활동을 했나요?","placeholder":"예: 도시락 배달","required":true,"order":0},{"key":"situation","question":"참여 계기나 배경은?","placeholder":"어떻게 참여하게 됐나요?","required":true,"order":1},{"key":"result","question":"어떤 일을 했고 어떤 변화가?","placeholder":"한 일, 달라진 것","required":true,"order":2},{"key":"learned","question":"새롭게 느끼거나 배운 것은? (선택)","placeholder":"깨달음","required":false,"order":3}]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ✅ 패치 완료!
-- experiences: impact_signal, confidence_score, confidence_level, quality_score 컬럼 추가됨
-- evidence_items, experience_competencies 테이블 생성됨
-- daily_progress: growth_streak 컬럼 추가됨
-- Storage 버킷, 배지, 프롬프트 세트 추가됨
-- ============================================================
