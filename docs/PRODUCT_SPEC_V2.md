# ValueLog v2 — Product Specification

> 최종 업데이트: 2026-02-25
> 버전: 2.2

---

## 1. 제품 목적
개인의 일상 경험을 체계적으로 기록하고, **성장 신호(증거+역량+성과)**를 축적하여 포트폴리오/자기관리에 활용할 수 있는 모바일 퍼스트 앱.

---

## 2. 기술 스택 / 제약
| 항목 | 선택 | 이유 |
|------|------|------|
| Frontend | React + Vite + TypeScript | 빌드 속도, 타입 안전성 |
| Styling | Tailwind CSS | 유틸리티 퍼스트, 빠른 디자인 반영 |
| Backend/DB | Supabase (무료 플랜) | Auth + Postgres + Storage + RLS |
| Deploy | Netlify | 정적 SPA 배포 무료 |
| 외부 API | **없음** | CORS 이슈 + 유료 서비스 금지 |
| LLM | **없음** | 룰베이스/템플릿 기반 |

---

## 3. 핵심 개념

### 3.1 카테고리 (9종)
`exercise` · `study` · `experience` · `work` · `project` · `social` · `creative` · `volunteer` · `daily`

### 3.2 신뢰등급 (Confidence)
자기 서술의 **외부 납득 가능성**을 시스템이 자동 산출. 자기평가(Self)와 분리.

| 레벨 | 점수 범위 | 의미 | 아이콘 |
|------|----------|------|--------|
| draft | 0–29 | 기록만 있는 초안 | 📝 |
| evidence | 30–79 | 증거 포함 | 🔖 |
| verified | 80–100 | 다중 증거 검증됨 | ✅ |

**점수 계산 룰 (MVP 룰베이스):**
- proof URL 1개 이상: +30
- impact_signal 입력: +40
- 역량 체크 1개 이상: +20
- 최대 합계: 90점 (URL+impact+역량)

> ⚠️ 외부 리뷰(Peer Review)는 MVP 제외. 스팸/RLS 리스크.추후 authenticated users only로 검토.

### 3.3 역량 체크 (Competency)
숫자 점수 직접 입력 방지 → **행동 체크리스트 → 레벨 자동 산출** 방식.

| 역량 | key | 설명 |
|------|-----|------|
| 문제해결 | problem_solving | 문제를 정의하고 해결하는 능력 |
| 소통 | communication | 생각을 전달하고 경청하는 능력 |
| 실행력 | execution | 계획을 실제로 해내는 능력 |
| 학습력 | learning | 새로운 것을 배우고 적용하는 능력 |
| 협업 | collaboration | 팀과 함께 목표를 달성하는 능력 |
| 주도성 | ownership | 자발적으로 책임지고 이끄는 능력 |
| 계획력 | planning | 목표를 세우고 체계적으로 준비하는 능력 |
| 성찰 | reflection | 경험을 되돌아보고 성장으로 연결하는 능력 |

- 역량당 체크 항목 5개 (Yes/No)
- checkedCount → level (0~5): `0→1`, `1→1`, `2→2`, ..., `5→5`
- 레벨별 앵커 문장 제공 (예: Lv3 = "근거를 들어 내 생각을 표현했다")
- **프론트 상수** (`src/lib/competencies.ts`)로 시작 → 추후 DB화 가능

### 3.4 증빙 URL (Evidence)
- 경험 1건에 URL 0~3개 첨부
- 저장 내용: `url` (필수, http 시작), `title` (선택), `note` (선택)
- OG 메타 자동 수집 **금지** (CORS 불안정, MVP 운영 이슈)
- UI: 퀘스트 완료 후 enrichment 단계 / 타임라인 상세 페이지에서 추가/삭제 가능

### 3.5 성과 신호 (Impact Signal)
- 타입: `metric`(수치/지표) | `feedback`(피드백/코멘트) | `artifact`(결과물 링크/설명)
- 예시: "달리기 5km → 6km 향상", "팀장님 '이번 보고서 정말 좋았어'", "GitHub PR 머지됨"

---

## 4. XP & 보상 시스템

### XP 계산
```
기본: 퀘스트 완료 +20
보너스 (누적 가능):
  역량 체크 1개 이상:  +5
  impact_signal 입력: +10
  proof URL 1개 이상: +10
  evidence 레벨 달성: +10
최대: 55 XP/1퀘스트
```

### 스트릭 2종
| 스트릭 | 조건 | 표시 |
|--------|------|------|
| 기록 스트릭 🔥 | 매일 퀘스트 1회 완료 | 헤더 주황 뱃지 |
| 성장 스트릭 🌿 | 해당 날에 evidence 이상 경험 1건 | 헤더 초록 뱃지 (있을 때만) |

### 배지 (22종)
- 기록 횟수: 1, 5, 10, 30, 50개
- 기록 스트릭: 3, 7, 14, 30일
- XP: 100, 500, 1000, 3000
- 퀄리티: deep_thinker(200자), storyteller(400자)
- 카테고리: curious_mind(3종), all_rounder(5종)
- 성장 스트릭: growth_streak_3, growth_streak_7
- evidence: evidence_10
- impact: impact_5
- 역량 다양성: competency_4

---

## 5. 퀘스트 플로우 (5단계)

```
category → answering → photo → enrichment → completed
```

1. **category**: 9개 카테고리 선택
2. **answering**: 카테고리별 4개 질문 (예시 칩 + 가이드 텍스트)
3. **photo**: 활동 사진 선택/촬영 (선택, Supabase Storage)
4. **enrichment**: 3개 탭
   - 🔗 증빙 링크 (URL + 제목)
   - 📊 성과 수치 (metric/feedback/artifact)
   - 💡 역량 체크 (1~3개 선택 → 5개 체크리스트)
5. **completed**: XP 상세 (기본+보너스), confidence 배지, 스트릭, 새 배지

---

## 6. 화면 구성

| 화면 | 경로 | 주요 기능 |
|------|------|----------|
| 로그인 | /login | 이메일+비밀번호, 매직링크, 회원가입 |
| 온보딩 | /onboarding | 닉네임, 주간목표, 관심사 |
| 홈 | / | Lv/XP, 오늘 퀘스트, 기록/성장 스트릭, 배지 수 |
| 퀘스트 | /quest | 5단계 기록 플로우 |
| 기록 | /timeline | 경험 목록 (카테고리 필터) |
| 기록 상세 | /timeline/:id | confidence 배지, 증빙링크, 역량, 답변, 수정/삭제 |
| **통계** | /stats | 30일 지표, 주간목표, 모멘텀, 인사이트 (신규) |
| 배지 | /badges | 획득/잠금 배지 목록 |
| 설정 | /settings | 프로필, 데이터 내보내기, 로그아웃 |

---

## 7. Stats & Insights

### 표시 지표 (최근 30일)
- 기록 수 / 기록 스트릭 / 성장 스트릭
- 증거 포함률 (evidence+verified / total)
- 성과 기록률 (impact_signal 포함 / total)
- 역량 커버리지 (사용한 서로 다른 역량 수 / 8)
- 카테고리 다양성 (서로 다른 카테고리 수 / 9)
- 주간 목표 달성률 (현재 주 기준)
- 모멘텀: 최근 7일 vs 이전 7일 (기록 수, XP)

### 룰베이스 인사이트 (최대 3개)
| 조건 | 메시지 |
|------|--------|
| evidence 비율 < 30% && 기록 >= 3 | "오늘은 증빙 링크 1개만 붙여보세요" |
| impact 비율 < 20% && 기록 >= 3 | "전/후 수치 1줄만 추가해보세요" |
| 카테고리 다양성 <= 2 && 기록 >= 5 | "내일은 다른 카테고리로 1회 기록 추천" |
| 주간목표 >= 100% 달성 | "이번 주 목표 달성! 정말 잘하고 있어요 🎉" |
| 성장 스트릭 >= 3 | "성장 스트릭 N일! 증거 포함 기록이 습관이 되고 있어요" |

> 차트 라이브러리 없음. CSS 프로그레스 바 사용.
> 통계 계산: 클라이언트 쿼리 집계 (유저 수 적음 전제). 성능 이슈 시 Supabase view로 개선.

---

## 8. STARR 관련
- **UI에 STARR 용어 노출 없음** (요구사항)
- DB `experiences.structured` jsonb에 step_key:answer 형태로 내부 저장
- 질문은 자연어로 "어떤 운동을 했나요?" 형태

---

## 9. 개방 포인트 (추후 검토)
- Peer Review (verified 레벨): 스팸/RLS 리스크로 MVP 제외
- 역량 체크리스트 DB화: 현재 프론트 상수, 필요 시 `competency_definitions` 테이블 추가
- 통계 Supabase View: 유저 증가 시 클라이언트 집계 → DB 집계로 전환
- OG 메타 자동 수집: 서버사이드 함수(Edge Function) 구현 시 재검토
