-- ============================================================
-- ValueLog v2.1 — Supabase 패치
-- 기존 스키마에 아래 내용을 추가로 실행하세요.
-- Supabase → SQL Editor에 붙여넣고 Run
-- ============================================================

-- ============================================================
-- 1. experiences 테이블에 image_urls 컬럼 추가
-- ============================================================
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 2. Supabase Storage 버킷 생성 (experience-images)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'experience-images',
  'experience-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Storage 정책 설정
-- ============================================================
DROP POLICY IF EXISTS "images: authenticated upload" ON storage.objects;
CREATE POLICY "images: authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'experience-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "images: public read" ON storage.objects;
CREATE POLICY "images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'experience-images');

DROP POLICY IF EXISTS "images: own delete" ON storage.objects;
CREATE POLICY "images: own delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'experience-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 4. 새 카테고리 prompt_sets 추가
-- ============================================================
INSERT INTO public.prompt_sets (category, title, steps) VALUES
  ('experience', '견학/체험', '[
    {"key":"what","question":"어떤 견학/체험을 했나요?","placeholder":"예: 국립박물관 견학, 도예 체험, 제주도 여행","required":true,"order":0},
    {"key":"where","question":"어디서, 누구와 함께였나요?","placeholder":"장소, 동행인","required":true,"order":1},
    {"key":"highlight","question":"가장 인상 깊었던 순간이나 발견은?","placeholder":"눈에 담고 싶었던 장면, 놀라운 사실","required":true,"order":2},
    {"key":"takeaway","question":"이 경험에서 얻은 것은? (선택)","placeholder":"새로운 시각, 해보고 싶어진 것","required":false,"order":3}
  ]'),
  ('social', '사람/관계', '[
    {"key":"who","question":"누구와 무엇을 했나요?","placeholder":"예: 친구들과 저녁, 동료와 커피 미팅","required":true,"order":0},
    {"key":"situation","question":"어떤 분위기였나요?","placeholder":"즐거웠나요? 의미 있었나요?","required":true,"order":1},
    {"key":"highlight","question":"가장 기억에 남는 대화나 순간은?","placeholder":"인상 깊었던 이야기, 에피소드","required":true,"order":2},
    {"key":"feeling","question":"만남 이후 기분은? (선택)","placeholder":"어떤 감정으로 헤어졌나요?","required":false,"order":3}
  ]'),
  ('creative', '창작/취미', '[
    {"key":"activity","question":"어떤 창작/취미 활동을 했나요?","placeholder":"예: 수채화 그리기, 기타 연습, 뜨개질","required":true,"order":0},
    {"key":"process","question":"어떻게 진행했나요?","placeholder":"무엇을 만들었나요? 어떤 과정이었나요?","required":true,"order":1},
    {"key":"result","question":"결과물이나 성취는?","placeholder":"완성됐나요? 어디까지?","required":true,"order":2},
    {"key":"feeling","question":"활동하면서 느낀 점은? (선택)","placeholder":"즐거웠나요? 어떤 점이 좋았나요?","required":false,"order":3}
  ]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. 퀄리티 기반 배지 추가
-- ============================================================
INSERT INTO public.badges (key, name, description, icon, criteria) VALUES
  -- 기록 퀄리티: 한 퀘스트에 작성한 총 글자 수
  ('deep_thinker',        '깊은 생각가',      '한 기록에 200자 이상 상세하게 작성했어요',   '🧠', '{"type":"writing_depth","value":200}'),
  ('storyteller',         '스토리텔러',        '한 기록에 400자 이상 풍부하게 작성했어요',   '✍️', '{"type":"writing_depth","value":400}'),
  -- 카테고리 다양성: 사용한 카테고리 종류 수
  ('curious_mind',        '호기심 탐험가',      '3가지 카테고리를 기록했어요',               '🗺️', '{"type":"category_diversity","value":3}'),
  ('all_rounder',         '올라운더',           '5가지 이상 카테고리를 경험했어요',           '🌈', '{"type":"category_diversity","value":5}'),
  ('experience_master',   '경험 마스터',        '모든 카테고리를 한 번씩 기록했어요 (9종)',   '💡', '{"type":"category_diversity","value":9}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ✅ 패치 완료!
-- ============================================================
