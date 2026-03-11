# ValueLog v2 🌱

> 매일 퀘스트로 성장을 기록하는 앱
[ValueLog_v2 사용해 보기](https://valuelog-app-v2-2026.web.app) 

---

## 🚀 10분 빠른 배포

### 1. Supabase 설정
1. [supabase.com](https://supabase.com) → 새 프로젝트 생성 (Region: Northeast Asia)
2. SQL Editor에서 `docs/SUPABASE_SCHEMA_V2.sql` 전체 실행
3. Project Settings → API에서 URL과 anon key 복사

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일 편집:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. 로컬 실행
```bash
npm install
npm run dev
# http://localhost:5173 접속
```

### 4. Firebase 배포
```bash
# Firebase CLI 로그인 (최초 1회)
npx firebase login

# 빌드 및 배포
npm run build
npx firebase deploy
```

자세한 배포 가이드: **[docs/FIREBASE_DEPLOY_V2.md](docs/FIREBASE_DEPLOY_V2.md)**

---

## ✨ 기능

| 기능 | 상태 |
|------|------|
| 이메일/비밀번호 로그인 | ✅ |
| 이메일 매직링크 로그인 | ✅ |
| 온보딩 (닉네임/목표/카테고리) | ✅ |
| 오늘의 퀘스트 (채팅형 Q&A) | ✅ |
| XP/레벨 시스템 | ✅ |
| 스트릭 (연속 기록) | ✅ |
| 배지 해금 | ✅ |
| 타임라인/기록 상세 | ✅ |
| 기록 수정/삭제 | ✅ |
| 데이터 JSON 내보내기 | ✅ |
| 모바일 최적화 (360px+) | ✅ |
| RLS 보안 | ✅ |

---

## 🛠 기술 스택

- **Frontend**: React 19 + Vite + TypeScript
- **Style**: TailwindCSS v4 (Vanilla CSS)
- **Routing**: React Router v7
- **State**: Zustand
- **Backend**: Supabase (Auth + PostgreSQL + RLS)
- **배포**: Firebase Hosting (프론트) + Supabase (백엔드)

---

## 📁 문서

- [제품 스펙](docs/PRODUCT_SPEC_V2.md)
- [아키텍처](docs/ARCHITECTURE_V2.md)
- [DB 스키마](docs/SUPABASE_SCHEMA_V2.sql)
- [배포 가이드](docs/FIREBASE_DEPLOY_V2.md)

---

## 💡 개발 원칙

- **비용 0원**: 외부 LLM API 없이 룰베이스 질문 템플릿
- **STARR 숨김**: 내부 데이터 구조로만 사용, UI 노출 금지
- **모바일 우선**: 360px 기준 최적화
- **RLS 필수**: 모든 사용자 데이터는 본인만 접근
