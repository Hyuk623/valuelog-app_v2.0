-- ============================================================
-- ValueLog v2.3 — 스킬 및 역량 고도화 패치 (기존 DB에 추가 실행)
-- 
-- 이 파일만 실행하면 됩니다 (v2.2 이후 적용).
-- ============================================================

-- ============================================================
-- STEP 1. SKILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skills (
  key         text PRIMARY KEY,
  name_ko     text NOT NULL,
  description text NULL,
  is_active   boolean NOT NULL DEFAULT true
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills: everyone read" ON public.skills;
CREATE POLICY "skills: everyone read" ON public.skills FOR SELECT USING (true);
-- 사용자 추가 차단 (관리자 전용)

CREATE TABLE IF NOT EXISTS public.experience_skills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  skill_key     text NOT NULL REFERENCES public.skills(key),
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.experience_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exp_skills: own read"   ON public.experience_skills;
DROP POLICY IF EXISTS "exp_skills: own insert" ON public.experience_skills;
DROP POLICY IF EXISTS "exp_skills: own delete" ON public.experience_skills;
CREATE POLICY "exp_skills: own read"   ON public.experience_skills FOR SELECT USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "exp_skills: own insert" ON public.experience_skills FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "exp_skills: own delete" ON public.experience_skills FOR DELETE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));

-- ============================================================
-- STEP 2. COMPETENCIES & RUBRICS 마스터 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.competencies (
  key         text PRIMARY KEY,
  name_ko     text NOT NULL,
  description text NOT NULL,
  domain      text NOT NULL DEFAULT 'core',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "competencies: everyone read" ON public.competencies;
CREATE POLICY "competencies: everyone read" ON public.competencies FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.competency_rubric_versions (
  competency_key text NOT NULL REFERENCES public.competencies(key) ON DELETE CASCADE,
  version        int NOT NULL,
  definition     text NOT NULL,
  checklist_items jsonb NOT NULL,
  anchors        jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (competency_key, version)
);
ALTER TABLE public.competency_rubric_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rubrics: everyone read" ON public.competency_rubric_versions;
CREATE POLICY "rubrics: everyone read" ON public.competency_rubric_versions FOR SELECT USING (true);

-- ============================================================
-- STEP 3. EXPERIENCE_COMPETENCIES 스키마 갱신 (v2.2 -> v2.3)
-- v2.2의 컬럼을 삭제/수정하여 Snapshot 방식 수용
-- ============================================================
-- 컬럼이 존재하면 타입 변경이 어려우므로, 안전하게 DROP 후 다시 생성합니다. (개발 환경 상정)
DROP TABLE IF EXISTS public.experience_competencies CASCADE;
CREATE TABLE public.experience_competencies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id      uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  competency_key     text NOT NULL,
  rubric_version     int  NOT NULL DEFAULT 1,
  checklist_snapshot jsonb NOT NULL DEFAULT '[]',
  checked_count      int  NOT NULL DEFAULT 0,
  level              int  NOT NULL DEFAULT 1,
  anchor_text        text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_competency_experience ON public.experience_competencies (experience_id);
ALTER TABLE public.experience_competencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "experience_competencies: own read"   ON public.experience_competencies;
DROP POLICY IF EXISTS "experience_competencies: own insert" ON public.experience_competencies;
DROP POLICY IF EXISTS "experience_competencies: own update" ON public.experience_competencies;
DROP POLICY IF EXISTS "experience_competencies: own delete" ON public.experience_competencies;
CREATE POLICY "experience_competencies: own read"   ON public.experience_competencies FOR SELECT USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "experience_competencies: own insert" ON public.experience_competencies FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "experience_competencies: own update" ON public.experience_competencies FOR UPDATE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "experience_competencies: own delete" ON public.experience_competencies FOR DELETE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));

-- ============================================================
-- STEP 4. EXPERIENCES 추가 컬럼 (혹시 누락된 경우)
-- ============================================================
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS trust_label       text    NOT NULL DEFAULT 'self';
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS trust_score       int     NOT NULL DEFAULT 0;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS growth_index      numeric NULL;

-- ============================================================
-- STEP 5. SEED DATA (Skills & Competencies)
-- ============================================================
INSERT INTO public.skills (key, name_ko, description) VALUES
  ('react', 'React', '프론트엔드 UI 라이브러리'),
  ('typescript', 'TypeScript', '타입스크립트'),
  ('python', 'Python', '데이터 분석 및 스크립팅'),
  ('design', 'UI/UX Design', '화면 및 경험 설계'),
  ('communication', 'Business Communication', '문서/회의 소통')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.competencies (key, name_ko, description, domain) VALUES
  ('problem_solving', '문제해결', '문제를 정의하고 해결하는 능력', 'core'),
  ('communication', '소통', '생각을 전달하고 경청하는 능력', 'core'),
  ('execution', '실행력', '계획을 실제로 해내는 능력', 'core'),
  ('learning', '학습력', '새로운 것을 배우고 적용하는 능력', 'core'),
  ('collaboration', '협업', '팀과 함께 목표를 달성하는 능력', 'core'),
  ('ownership', '주도성', '자발적으로 책임지고 이끄는 능력', 'core'),
  ('planning', '계획력', '목표를 세우고 체계적으로 준비하는 능력', 'core'),
  ('reflection', '성찰', '경험을 되돌아보고 성장으로 연결하는 능력', 'core')
ON CONFLICT (key) DO NOTHING;

-- 패치 완료!
