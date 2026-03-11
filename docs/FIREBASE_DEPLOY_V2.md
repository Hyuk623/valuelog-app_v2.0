# Firebase 배포 가이드 (ValueLog v2)

> **목표:** Supabase 설정부터 Firebase Hosting 배포까지 완료하기

---

## 1단계: Supabase 설정

### 1. 프로젝트 생성
1. [https://supabase.com](https://supabase.com) 에서 프로젝트 생성
2. Region: `Northeast Asia (Seoul)` 권장

### 2. SQL 스키마 실행
1. Supabase 대시보드 → **SQL Editor** 클릭
2. `docs/SUPABASE_SCHEMA_V2.sql` 파일의 전체 내용을 복사하여 실행
3. (필요 시) `docs/SUPABASE_PATCH_v*.sql` 최신 패치들도 순서대로 실행

---

## 2단계: 환경변수 설정

1. 프로젝트 루트에 `.env` 파일 생성 (또는 `.env.example` 복사)
   ```bash
   cp .env.example .env
   ```
2. Supabase Settings → API에서 다음 값을 찾아 기입:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 3단계: Firebase 배포

### 1. Firebase 로그인 및 초기화 (최초 1회)
```bash
npx firebase login
npx firebase init hosting
```
- 프로젝트 선택: `valuelog-app-v2-2026`
- Directory: `dist`
- Single-page app: `Yes`
- GitHub deploys: `No` (수동 배포 시)

### 2. 빌드 및 배포
```bash
npm run build
npx firebase deploy
```

---

## 4단계: 사후 설정

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL** 에 Firebase 배포 URL 입력:
   `https://valuelog-app-v2-2026.web.app`

---

## 배포 체크리스트

- [ ] Supabase 테이블 생성이 완료되었는가?
- [ ] `.env` 파일에 환경변수가 올바르게 설정되었는가?
- [ ] `npm run build`가 오류 없이 완료되었는가?
- [ ] `firebase deploy` 후 제공된 URL로 접속이 가능한가?
- [ ] Supabase Auth URL 설정이 배포된 URL로 업데이트 되었는가?
