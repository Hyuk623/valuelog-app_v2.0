# Netlify 배포 가이드 (ValueLog v2)

> **목표:** Supabase 프로젝트 생성 → SQL 실행 → Netlify 배포까지 **10분 내** 완료

---

## 1단계: Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에서 회원가입/로그인
2. **New Project** 클릭
   - Organization: 자유
   - Project name: `valuelog-v2`
   - Database password: 안전하게 저장
   - Region: `Northeast Asia (Seoul)` 선택
3. 프로젝트 생성 완료까지 ~2분 대기

---

## 2단계: SQL 스키마 실행

1. Supabase 대시보드 → **SQL Editor** 클릭
2. `docs/SUPABASE_SCHEMA_V2.sql` 파일의 전체 내용을 복사
3. SQL Editor에 붙여넣기 → **Run** 버튼 클릭
4. "Success" 메시지 확인

---

## 3단계: Supabase Auth 설정

1. **Authentication** → **Configuration** → **Auth Providers**
2. Email provider 확인 (기본 활성화)
3. **Confirm email**: 테스트 시 OFF 권장 (Settings → Auth → Email)
   - `Enable email confirmations` 체크 해제 (선택사항)

---

## 4단계: Netlify 배포

### 방법 A: GitHub 연동 (권장)

1. [https://github.com](https://github.com) 에 코드 push
   ```bash
   git init
   git add .
   git commit -m "ValueLog v2 initial"
   git remote add origin https://github.com/YOUR_USERNAME/valuelog-v2
   git push -u origin main
   ```

2. [https://netlify.com](https://netlify.com) 로그인 → **Add new site** → **Import an existing project**

3. GitHub 연동 → 레포 선택

4. 빌드 설정:
   | 항목 | 값 |
   |------|-----|
   | Build command | `npm run build` |
   | Publish directory | `dist` |
   | Node version | `20` |

5. **Environment variables** 추가:
   ```
   VITE_SUPABASE_URL     = https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGci...
   ```

6. **Deploy site** 클릭

### 방법 B: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL https://xxxxx.supabase.co
netlify env:set VITE_SUPABASE_ANON_KEY eyJhbGci...
netlify deploy --prod
```

---

## 5단계: Supabase URL 설정

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL** 에 Netlify 배포 URL 입력:
   ```
   https://your-site-name.netlify.app
   ```
3. **Redirect URLs** 에도 동일 URL 추가

---

## 환경변수 찾는 위치

Supabase 대시보드 → **Project Settings** → **API**

| 환경변수 | Supabase 항목 |
|----------|---------------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` key |

---

## 배포 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] SQL 스키마 실행 완료 (7개 테이블 + 배지 시드)
- [ ] `VITE_SUPABASE_URL` 환경변수 설정
- [ ] `VITE_SUPABASE_ANON_KEY` 환경변수 설정
- [ ] `public/_redirects` 파일 존재 확인
- [ ] Netlify 배포 성공 (Build log에서 "Netlify Build Complete" 확인)
- [ ] Supabase Auth URL 설정 완료
- [ ] 회원가입 → 온보딩 → 퀘스트 → 타임라인 동선 수동 테스트

---

## 수동 e2e 테스트 시나리오

### 시나리오 1: 신규 사용자 온보딩
1. Netlify URL 접속 → 로그인 페이지 확인
2. 이메일/비밀번호로 회원가입
3. 온보딩 3단계 완료 (닉네임 → 목표 → 카테고리)
4. 홈 화면 도달 확인

### 시나리오 2: 퀘스트 완료
1. 홈 → "퀘스트 시작" 클릭
2. 카테고리 선택 → 질문 답변 완료
3. 완료 화면에서 XP 표시 확인
4. 홈 돌아와서 XP/스트릭 반영 확인
5. 타임라인에서 기록 확인

### 시나리오 3: RLS 검증 (다중 계정)
1. 계정 A로 기록 3개 생성
2. 계정 B로 로그인
3. 타임라인에 계정 A의 기록이 보이지 않음 확인
4. 계정 B의 기록만 표시 확인

### 시나리오 4: 모바일 (360px 폭)
1. Chrome DevTools → iPhone SE 모드
2. 전체 앱 화면 이동 (홈/퀘스트/타임라인/배지/설정)
3. 레이아웃 깨짐 없음 확인

---

## 자주 묻는 문제

**Q: 로그인 후 온보딩이 계속 뜨나요?**
A: Supabase profiles 테이블에 데이터가 저장되는지 확인하세요. RLS 정책이 올바른지 확인.

**Q: 빌드 오류?**
A: Node 버전이 20인지 확인. Netlify 환경변수가 정확한지 확인.

**Q: 이메일 인증 메일이 안 오나요?**
A: Supabase Auth → Email confirmation 비활성화 후 테스트.
