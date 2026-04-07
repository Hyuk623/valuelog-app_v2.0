-- ============================================================
-- ValueLog v2.6 Patch — Skills Expansion (30+ Diverse Skills)
-- ============================================================

INSERT INTO public.skills (key, name_ko, description) VALUES
  -- Development & Tech
  ('javascript', 'JavaScript', '웹 언어의 기초'),
  ('java', 'Java', '백엔드/엔터프라이즈 개발'),
  ('sql', 'SQL/Database', '데이터 관리 및 쿼리'),
  ('git', 'Git/Github', '버전 관리 및 협업'),
  ('aws', 'Cloud (AWS/GCP)', '클라우드 인프라'),
  ('ai_prompting', 'AI 프롬프팅', 'LLM 활용 능력'),
  
  -- Design & Media
  ('figma', 'Figma', 'UI/UX 디자인 도구'),
  ('photoshop', 'Photoshop/Illustrator', '이미지 편집 및 그래픽'),
  ('video_editing', '영상 편집', '프리미어/파이널컷 등'),
  
  -- Business & Planning
  ('marketing', '디지털 마케팅', '퍼포먼스/콘텐츠 마케팅'),
  ('ga4', '데이터 분석 (GA4/Amplitude)', '사용자 로그 분석'),
  ('presentation', 'PT/발표', '설득력 있는 스피치'),
  ('copywriting', '카피라이팅', '설득력 있는 글쓰기'),
  ('strategy', '전략/기획', '사업 전략 및 기획'),
  
  -- Soft Skills & Process
  ('leadership', '리더십', '팀 리딩 및 방향 설정'),
  ('negotiation', '협상', '이해관계 조정 및 협상'),
  ('facilitation', '퍼실리테이션', '회의 및 워크숍 촉진'),
  ('agile', '애자일/스크럼', '유연한 개발/업무 프로세스'),
  
  -- Productivity Tools
  ('notion', 'Notion', '문서화 및 협업 도구'),
  ('slack', 'Slack', '팀 커뮤니케이션'),
  ('excel', 'Excel/Spreadsheet', '데이터 정리 및 수식 활용'),
  
  -- Languages
  ('english_biz', '비즈니스 영어', '영어 회의 및 메일링'),
  ('japanese_biz', '비즈니스 일본어', '일본어 소통'),
  ('chinese_biz', '비즈니스 중국어', '중국어 소통')
ON CONFLICT (key) DO UPDATE SET 
  name_ko = EXCLUDED.name_ko,
  description = EXCLUDED.description;
