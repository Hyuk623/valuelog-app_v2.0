-- ============================================================
-- ValueLog v2.3 — Full Schema (재실행 안전 / 멱등)
-- 기존 v2.2 스키마를 포함하며, Skill, Competency Library, Trust/Growth, Project Mode 확장을 포함합니다.
-- Supabase → SQL Editor 에서 전체 붙여넣고 Run
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  timezone     text NOT NULL DEFAULT 'Asia/Seoul',
  weekly_goal  int  NOT NULL DEFAULT 3,
  interests    text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles: own read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: own insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles: own update" ON public.profiles;
CREATE POLICY "profiles: own read"   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles: own insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles: own update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (new.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. PROMPT_SETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prompt_sets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text NOT NULL,
  title      text NOT NULL,
  steps      jsonb NOT NULL DEFAULT '[]',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prompt_sets: everyone read" ON public.prompt_sets;
CREATE POLICY "prompt_sets: everyone read" ON public.prompt_sets FOR SELECT USING (true);


-- ============================================================
-- 3. EXPERIENCES (v2.3: trust_score, trust_label, growth_index)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.experiences (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date        date    NOT NULL,
  category          text    NOT NULL DEFAULT 'daily',
  title             text    NOT NULL DEFAULT '',
  summary           text,
  structured        jsonb,
  xp_earned         int     NOT NULL DEFAULT 0,
  image_urls        text[]  NOT NULL DEFAULT '{}',
  impact_signal     jsonb   NULL,          -- {type:'metric'|'feedback'|'artifact', value:'...'}
  confidence_score  int     NOT NULL DEFAULT 0,
  confidence_level  text    NOT NULL DEFAULT 'draft',
  quality_score     int     NOT NULL DEFAULT 0,
  -- v2.3
  trust_label       text    NOT NULL DEFAULT 'self', -- self/evidence/peer/issuer
  trust_score       int     NOT NULL DEFAULT 0,
  growth_index      numeric NULL,
  
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS image_urls       text[]  NOT NULL DEFAULT '{}';
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS impact_signal    jsonb   NULL;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS confidence_score int     NOT NULL DEFAULT 0;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS confidence_level text    NOT NULL DEFAULT 'draft';
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS quality_score    int     NOT NULL DEFAULT 0;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS trust_label      text    NOT NULL DEFAULT 'self';
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS trust_score      int     NOT NULL DEFAULT 0;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS growth_index     numeric NULL;

CREATE INDEX IF NOT EXISTS idx_experiences_user_date     ON public.experiences (user_id, local_date DESC);
CREATE INDEX IF NOT EXISTS idx_experiences_category      ON public.experiences (user_id, category);
CREATE INDEX IF NOT EXISTS idx_experiences_confidence    ON public.experiences (user_id, confidence_level);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "experiences: own read"   ON public.experiences;
DROP POLICY IF EXISTS "experiences: own insert" ON public.experiences;
DROP POLICY IF EXISTS "experiences: own update" ON public.experiences;
DROP POLICY IF EXISTS "experiences: own delete" ON public.experiences;
-- Note: peer review / project reviewer read logic will be handled via functions/RLS extension later.
CREATE POLICY "experiences: own read"   ON public.experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "experiences: own insert" ON public.experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "experiences: own update" ON public.experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "experiences: own delete" ON public.experiences FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_experiences_updated_at ON public.experiences;
CREATE TRIGGER trg_experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. EXPERIENCE_ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.experience_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  step_key      text NOT NULL,
  answer        text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_answers_experience ON public.experience_answers (experience_id);
ALTER TABLE public.experience_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "answers: own read"   ON public.experience_answers;
DROP POLICY IF EXISTS "answers: own insert" ON public.experience_answers;
DROP POLICY IF EXISTS "answers: own update" ON public.experience_answers;
DROP POLICY IF EXISTS "answers: own delete" ON public.experience_answers;
CREATE POLICY "answers: own read"   ON public.experience_answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "answers: own insert" ON public.experience_answers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "answers: own update" ON public.experience_answers FOR UPDATE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "answers: own delete" ON public.experience_answers FOR DELETE USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));

-- ============================================================
-- 5. EVIDENCE_ITEMS
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
-- 6. SKILLS
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
-- write는 admin만 설정 (UI에서 일반 유저 차단)

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
-- 7. COMPETENCIES & RUBRICS
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


-- 기존 experience_competencies 테이블 드롭 및 재성성 (스키마 변경을 위해 강제)
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
-- 8. PEER REVIEW (EXTERNAL REVIEWS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.review_invites (
  token         text PRIMARY KEY,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  expires_at    timestamptz NOT NULL,
  redeemed_by   uuid NULL REFERENCES auth.users(id),
  redeemed_at   timestamptz NULL,
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.external_reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id      uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  reviewer_user_id   uuid NOT NULL REFERENCES auth.users(id),
  relationship       text NOT NULL,
  comment            text NULL,
  checklist_snapshot jsonb NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id, reviewer_user_id)
);
ALTER TABLE public.external_reviews ENABLE ROW LEVEL SECURITY;
-- reviewer can insert, owner can read.
DROP POLICY IF EXISTS "ext_reviews: owner read" ON public.external_reviews;
DROP POLICY IF EXISTS "ext_reviews: reviewer insert" ON public.external_reviews;
DROP POLICY IF EXISTS "ext_reviews: reviewer read" ON public.external_reviews;
CREATE POLICY "ext_reviews: owner read" ON public.external_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM public.experiences e WHERE e.id = experience_id AND e.user_id = auth.uid()));
CREATE POLICY "ext_reviews: reviewer read" ON public.external_reviews FOR SELECT USING (auth.uid() = reviewer_user_id);
CREATE POLICY "ext_reviews: reviewer insert" ON public.external_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_user_id);

-- allow read experience if redeemed
DROP POLICY IF EXISTS "experiences: redeemed review read" ON public.experiences;
CREATE POLICY "experiences: redeemed review read" ON public.experiences FOR SELECT USING (EXISTS (SELECT 1 FROM public.review_invites i WHERE i.experience_id = id AND i.redeemed_by = auth.uid() AND i.status = 'redeemed'));

-- ============================================================
-- 9. PROJECT MODE (ISSUER)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  org_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role    text NOT NULL, -- admin/reviewer
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text NULL,
  join_code   text UNIQUE NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_expectations (
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  competency_key text NOT NULL REFERENCES public.competencies(key),
  target_level   int NOT NULL,
  weight         int NOT NULL DEFAULT 1,
  PRIMARY KEY (project_id, competency_key)
);

CREATE TABLE IF NOT EXISTS public.project_participants (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.experience_projects (
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  PRIMARY KEY (experience_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.issuer_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id    uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES auth.users(id),
  comment          text NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id, reviewer_user_id)
);

-- ============================================================
-- 10. DAILY_PROGRESS & BADGES (유지, 생략된 부분 복원)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_progress (
  user_id                    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date                 date NOT NULL,
  completed                  boolean NOT NULL DEFAULT false,
  xp_total                   int NOT NULL DEFAULT 0,
  streak_count               int NOT NULL DEFAULT 0,
  last_completed_date        date,
  growth_completed           boolean NOT NULL DEFAULT false,
  growth_streak_count        int NOT NULL DEFAULT 0,
  last_growth_completed_date date,
  PRIMARY KEY (user_id, local_date)
);

CREATE TABLE IF NOT EXISTS public.badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL DEFAULT '🏅',
  criteria    jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- (기타 RLS 및 Storage, SEED 데이터 생략: v2.2 기존 데이터 유지)

-- ============================================================
-- 11. SEED DATA (Core Competencies V2)
-- ============================================================
INSERT INTO public.competencies (key, name_ko, description, domain) VALUES
  ('problem_solving', '문제 해결', '복잡한 문제를 분석하고 가장 합리적인 해결책을 도출/실행한다.', 'core')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.competency_rubric_versions (competency_key, version, definition, checklist_items, anchors) VALUES
  ('problem_solving', 1, '문제의 근본 원인을 파악하고 최적의 대안을 실행하여 개선을 이끌어냄',
   '[{"key":"root_cause","label":"문제의 근본 원인을 명확히 정의함"},{"key":"alternatives","label":"2가지 이상 대안 비교"},{"key":"resources","label":"최적안 선택"},{"key":"execution","label":"해결책 실행"},{"key":"retrospective","label":"부작용 극복/회고"}]',
   '{"1":"문제 해결을 위한 기본 시도","2":"구체적 실행","3":"근본 해법 찾음","4":"제약 관리","5":"구조적 개선"}')
ON CONFLICT (competency_key, version) DO NOTHING;

-- 추가 SEED 필요 시 앱의 Seed 스크립트에서 관리.
