# Development Log (ValueLog V2)

### 2026-04-04 (2) - 투명성 모델(Audit Log) 기반 경험 기록 스냅샷 뷰어 구축
- 요청 목적: 작성자가 내용을 자유롭게 수정할 수 있도록 하되, 이전 이력을 보존하여 외부 열람자 사이의 기록 '신뢰성(Trust)'을 유지하기 위함.
- 수행 내용: `experience_edit_logs` Supabase DDL SQL 생성. `ExperienceEditPage` 저장 시 변경 이전 원본을 JSON 묶음으로 INSERT 처리. `ExperienceDetailPage`에 '(수정됨)' 마크 및 전체 내역 뷰어(모달) 추가. 
- 수정 파일: `SUPABASE_PATCH_v2.4.sql`, `src/types/index.ts`, `ExperienceEditPage.tsx`, `ExperienceDetailPage.tsx`
- 핵심 변경: 시스템 전반에 데이터 무결성 보장을 위한 Audit 로깅 시스템 도입.
- 확인 결과: (로컬 스키마 반영 및 배포 대기 중)
- 이슈/리스크: 수정이 잦은 유저의 스냅샷 로딩 오버헤드.
- 다음 작업: 스키마 적용 및 정상 동작 검증 대기.



### 2026-04-04 - 기록 수정/삭제 화면 레이아웃 (Z-index) 충돌 해결
- 요청 목적: 기록 상세 및 수정 탭에서 하단 네비게이션(DockBar)에 가려지는 [저장] 버튼과 [삭제 확인 모달] 문제 해결 및 재배포.
- 수행 내용: `ExperienceEditPage`의 저장 탭 영역에 높은 z-index 할당시키고, `ExperienceDetailPage`의 모달 구조를 `createPortal` 방식의 최상단 노출로 리펙토링. Firebase 재배포.
- 수정 파일: `src/pages/timeline/ExperienceDetailPage.tsx`, `src/pages/timeline/ExperienceEditPage.tsx`
- 핵심 변경: 저장 버튼 눌림 불가 현상 개선 및 모달 z-index 레벨 정립.
- 확인 결과: 버튼과 모달이 정상적으로 Dock Bar 위에 렌더링 됨.
- 이슈/리스크: 없음
- 다음 작업: 추가 사용자 피드백 대기


### 2026-03-13 - 계정 삭제 로직 및 온보딩 플로우 수정
- 요청 목적: 계정 삭제 시 관련 데이터를 완전 삭제하고 재가입 시 신규 온보딩 프로세스를 올바르게 타도록 수정.
- 수행 내용: 사용자 프로필, 경험 데이터 등 관련 정보 완전 소거 로직 및 신규 등록 처리 개선.
- 수정 파일: (과거 이력) 회원 탈퇴 및 라우트 파일.
- 핵심 변경: 계정 삭제 후 잔존 데이터 문제 해결, 재가입 시 필수 정보(닉네임, 튜토리얼) 입력 강제.
- 확인 결과: 재가입 시 온보딩 프로세스 정상 진입 확인.
- 이슈/리스크: 없음
- 다음 작업: 서비스 안정화 및 추가 요구사항 대기

### 2026-03-10 - Firebase 배포 환경 구축 및 파비콘 업데이트
- 요청 목적: 프로젝트를 Firebase Hosting에 배포하고 브라우저 연결 이슈 해결 및 파비콘 변경.
- 수행 내용: `npm run build` 오류 개선 및 `firebase deploy` 배포.
- 수정 파일: `firebase.json`, `index.html`.
- 핵심 변경: 안정적인 서버 배포 및 서비스 접속 가능 환경 마련.
- 확인 결과: 배포 완료 및 접속 정상.
- 이슈/리스크: 잠재적 빌드 경고.
- 다음 작업: 회원 가입/탈퇴 오류 점검

### 2026-02-28 - 빌드(Vite) 에러 및 ESLint 문제 해결
- 요청 목적: 린트(Lint) 에러로 인한 프로덕션 빌드 실패 문제 해결.
- 수행 내용: React Hook 의존성 경고 수정 및 잘못된 선언 순서 교정.
- 수정 파일: 코드베이스 전반 컴포넌트 (`QuestPage.tsx` 외 다수).
- 핵심 변경: 린트 규칙 준수 및 빌드 스크립트 정상 구동 확보.
- 확인 결과: `npx vite build` 성공.
- 이슈/리스크: 린트 우회 없이 전면 수정하여 시간이 다소 소모.
- 다음 작업: 파이어베이스 배포 연동

### 2026-02-26 - Trust & Growth 스코어링 로직 적용
- 요청 목적: 신뢰도 및 성장 점수 기반 UI/비즈니스 로직 연동.
- 수행 내용: 기존 `calcConfidence`를 `calcTrust`로 변경.
- 수정 파일: `src/lib/competencies.ts`, UI 페이지(홈, 퀘스트, 통계 등).
- 핵심 변경: 경험치(XP) 보너스 로직에 Trust Label 반영 및 Growth Index 시각화.
- 확인 결과: UI에 새로운 스코어 정상 반영.
- 이슈/리스크: 초기 사용자들에게 Trust 점수가 적게 보이는 페널티 존재.
- 다음 작업: 코드 정리 및 빌드 오류 수정
