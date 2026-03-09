# ValueLog v2 — Architecture

> 최종 업데이트: 2026-02-25
> 버전: 2.2

---

## 1. 시스템 다이어그램

```
[사용자 브라우저]
     │
     │ HTTPS
     ▼
[Netlify CDN]          ← 정적 SPA (React + Vite 빌드)
     │
     │ Supabase JS (REST/Realtime)
     ▼
[Supabase]
  ├── Auth (JWT)
  ├── Postgres DB (RLS 적용)
  └── Storage (experience-images 버킷)
```

---

## 2. DB 스키마 (v2.2)

### 테이블 목록
| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필 (display_name, timezone, weekly_goal, interests) |
| `prompt_sets` | 카테고리별 질문 세트 (category, title, steps: jsonb) |
| `experiences` | 경험 기록 (v2.2: impact_signal, confidence_score, confidence_level, quality_score) |
| `experience_answers` | 각 질문에 대한 답변 |
| `evidence_items` | 증빙 URL (experience당 최대 3개) |
| `experience_competencies` | 역량 체크 결과 (experience당 최대 3개) |
| `daily_progress` | 일별 진행 상황 (v2.2: growth_completed, growth_streak_count) |
| `badges` | 배지 정의 (criteria: jsonb) |
| `user_badges` | 유저 획득 배지 |

### 신규 테이블: evidence_items
```sql
id            uuid PK
experience_id uuid FK → experiences(id) ON DELETE CASCADE
type          text DEFAULT 'url'
url           text NOT NULL
title         text NULL
note          text NULL
created_at    timestamptz
```

### 신규 테이블: experience_competencies
```sql
id              uuid PK
experience_id   uuid FK → experiences(id) ON DELETE CASCADE
competency_key  text NOT NULL       -- 8개 중 1개
checklist       jsonb               -- {items:[{key,label,checked}], checkedCount:n}
level           int 1~5             -- checkedCount 기반 자동 산출
anchor_text     text                -- 레벨별 설명 문장
created_at      timestamptz
UNIQUE (experience_id, competency_key)
```

### experiences 변경 (v2.2 추가)
```sql
impact_signal    jsonb NULL    -- {type:'metric'|'feedback'|'artifact', value:'...'}
confidence_score int DEFAULT 0
confidence_level text DEFAULT 'draft'  -- draft|evidence|verified
quality_score    int DEFAULT 0         -- 현재 분리만, 향후 별도 계산
```

### daily_progress 변경 (v2.2 추가)
```sql
growth_completed           boolean DEFAULT false
growth_streak_count        int     DEFAULT 0
last_growth_completed_date date    NULL
```

---

## 3. RLS 정책
모든 테이블에 Row Level Security 활성화.

| 테이블 | 정책 |
|--------|------|
| profiles | 본인만 CRUD |
| experiences | 본인만 CRUD |
| experience_answers | 본인의 experiences에 연결된 것만 CRUD |
| evidence_items | 본인의 experiences에 연결된 것만 CRUD |
| experience_competencies | 본인의 experiences에 연결된 것만 CRUD |
| daily_progress | 본인만 CRUD |
| user_badges | 본인만 SELECT/INSERT |
| badges | 모두 SELECT, INSERT/UPDATE/DELETE 차단 |
| prompt_sets | 모두 SELECT, INSERT/UPDATE/DELETE 차단 |

evidence_items, experience_competencies는 EXISTS 서브쿼리로 user_id 간접 검증:
```sql
EXISTS (SELECT 1 FROM experiences e WHERE e.id = experience_id AND e.user_id = auth.uid())
```

---

## 4. 데이터 흐름 & 계산 위치

### 퀘스트 완료 흐름
```
1. experiences INSERT (confidence=0, draft)
   + experience_answers INSERT

2. [photo 단계] Supabase Storage upload
   → experiences UPDATE (image_urls)

3. [enrichment 단계]
   3a. evidence_items INSERT (proof URLs)
   3b. experiences UPDATE (impact_signal)
   3c. experience_competencies INSERT

4. confidence 재계산 (클라이언트)
   calcConfidence({hasProofUrl, hasImpactSignal, hasCompetency})
   → experiences UPDATE (confidence_score, confidence_level)

5. XP 보너스 계산 (클라이언트)
   calcXPBonus({...}) → experiences UPDATE (xp_earned)
   → daily_progress UPDATE (xp_total += bonus)

6. 성장 스트릭 (클라이언트)
   if confidence_level >= 'evidence':
     이전날 growth_streak 조회 → +1
     daily_progress UPDATE (growth_completed, growth_streak_count)

7. 배지 체크 (클라이언트)
   모든 badges 조회 → criteria 매칭 → user_badges INSERT
```

### 계산 위치 결정 근거
| 계산 | 위치 | 이유 |
|------|------|------|
| confidence_score | 클라이언트 | 단순 룰베이스, DB 트리거 불필요 |
| XP 보너스 | 클라이언트 | 즉시 반영, 트리거로도 가능하나 MVP 단순화 |
| 성장 스트릭 | 클라이언트 | 날짜 계산이 timezone 의존적, KST 필요 |
| 배지 체크 | 클라이언트 | 배지 수가 제한적 (~22개), 유저 수 적음 전제 |

**추후 강화 계획:**
- 유저 증가 시 Supabase Database Function (pg_plpgsql)으로 이전
- 성장 스트릭: `after insert on experiences` 트리거로 이전 가능
- 빠른 집계: materialized view (통계 페이지)

---

## 5. Storage

**버킷:** `experience-images`
- public: true (공개 읽기)
- file_size_limit: 5MB
- 허용 MIME: jpeg, png, webp, gif, heic

**경로 규칙:** `{user_id}/{timestamp}.{ext}`
→ RLS: upload 시 folderName[0] = auth.uid() 검증

---

## 6. 프론트 상태 관리

**Zustand (useAuthStore)**
- user, session, profile, loading, initialized
- dailyProgress (growth_streak_count 포함)
- userBadges, totalXP

**로컬 상태 (각 페이지)**
- QuestPage: 5단계 stage, answers, drafts (enrichment)
- StatsPage: 쿼리 집계 결과
- ExperienceDetailPage: evidence, competencies (이 페이지에서 직접 fetch)

---

## 7. 역량 정의 관리

**현재**: `src/lib/competencies.ts` 프론트 상수
```typescript
COMPETENCIES: CompetencyDefinition[]  // 8개 역량
COMPETENCY_MAP: Record<key, def>      // 빠른 조회
calcCompetencyLevel(checkedCount)     // level 산출
calcConfidence(input)                 // confidence 계산
calcXPBonus(input)                    // XP 보너스 계산
```

**추후 DB화 시:**
```sql
CREATE TABLE competency_definitions (
  key          text PRIMARY KEY,
  label        text,
  icon         text,
  description  text,
  check_items  jsonb,  -- [{key, label}]
  anchors      jsonb   -- {1:text, 2:text, ..., 5:text}
);
```

---

## 8. 환경변수
```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
`.env` 파일 사용, `.gitignore` 포함.

---

## 9. 배포
- **Frontend**: Netlify (자동 빌드: `npm run build` → `dist/`)
- **Backend**: Supabase 프로젝트 (무료 플랜)
- **OG 메타 자동 수집**: MVP에서 **금지** (CORS 불안정, 운영 이슈)
  - 대안: URL + 수동 제목/메모 저장만
- Edge Function 없음 (MVP)

---

## 10. 보안 체크리스트
- [x] 모든 테이블 RLS 활성화
- [x] anon key만 클라이언트 노출 (service role key 절대 미노출)
- [x] Storage policy: upload은 authenticated + 본인 폴더만
- [x] evidence_items/competencies: existence check로 user 검증
- [x] 다른 유저 데이터 절대 노출 없음
