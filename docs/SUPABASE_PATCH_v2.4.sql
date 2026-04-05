-- ValueLog v2.4 Patch (Audit Log)
-- 경험 기록의 수정(오탈자 등) 내역을 보존하여 외부에 대한 데이터 신뢰도를 높이기 위한 테이블.

CREATE TABLE public.experience_edit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID REFERENCES public.experiences(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.experience_edit_logs ENABLE ROW LEVEL SECURITY;

-- 정책: 수정자 본인의 로그 조회 
CREATE POLICY "Users can view their own experience edit logs" 
ON public.experience_edit_logs FOR SELECT 
USING (auth.uid() = user_id);

-- 정책: 본인의 로그 추가
CREATE POLICY "Users can insert their own experience edit logs" 
ON public.experience_edit_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);
