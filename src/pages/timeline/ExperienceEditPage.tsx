import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Experience, ExperienceAnswer } from '@/types';
import { Button } from '@/components/ui/Button';
import { ChevronLeft } from 'lucide-react';

const STEP_LABELS: Record<string, string> = {
    activity: '활동', topic: '주제', task: '업무', goal: '목표', highlight: '하이라이트',
    situation: '상황', feeling: '기분', action: '내가 한 일', result: '결과',
    learned: '배운 점', next: '다음 할 일', achieved: '달성한 것', tomorrow: '내일 할 일',
};

export function ExperienceEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [experience, setExperience] = useState<Experience | null>(null);
    const [answers, setAnswers] = useState<ExperienceAnswer[]>([]);
    const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        if (!id || !user) return;
        setLoading(true);
        const [{ data: exp }, { data: ans }] = await Promise.all([
            supabase.from('experiences').select('*').eq('id', id).eq('user_id', user.id).single(),
            supabase.from('experience_answers').select('*').eq('experience_id', id).order('created_at'),
        ]);
        const e = exp as Experience | null;
        const a = (ans as ExperienceAnswer[]) ?? [];
        setExperience(e);
        setAnswers(a);
        setTitle(e?.title ?? '');
        const initial: Record<string, string> = {};
        a.forEach((ans) => { initial[ans.id] = ans.answer; });
        setEditedAnswers(initial);
        setLoading(false);
    };

    useEffect(() => {
        if (id && user) fetchData();
    }, [id, user]);

    const handleSave = async () => {
        if (!id || !user || !experience) return;
        setSaving(true);

        // Audit Log 생성 (Update 전 과거 스냅샷 저장)
        const snapshot = {
            title: experience.title,
            answers: answers.map(a => ({ step_key: a.step_key, answer: a.answer }))
        };
        await supabase.from('experience_edit_logs').insert({
            experience_id: id,
            user_id: user.id,
            snapshot
        });

        // Update title
        await supabase.from('experiences').update({ title, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);

        // Update each answer
        for (const ans of answers) {
            const newText = editedAnswers[ans.id] ?? ans.answer;
            if (newText !== ans.answer) {
                await supabase.from('experience_answers').update({ answer: newText }).eq('id', ans.id);
            }
        }

        setSaving(false);
        navigate(`/timeline/${id}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-surface transition-colors">
                <div className="px-5 pt-12 pb-4 border-b border-border">
                    <div className="h-6 w-32 shimmer rounded-lg" />
                </div>
                <div className="px-5 py-4 space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
                </div>
            </div>
        );
    }

    if (!experience) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
                <p className="text-gray-500 dark:text-gray-400">기록을 찾을 수 없어요</p>
                <button onClick={() => navigate('/timeline')} className="mt-4 text-brand-500 font-semibold">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-surface transition-colors duration-300">
            {/* Header */}
            <div className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-border transition-colors">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-2 transition-colors">
                    <ChevronLeft size={22} className="text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="font-extrabold text-gray-900 dark:text-gray-100 text-lg flex-1 transition-colors">기록 수정</h1>
            </div>

            {/* Form */}
            <div className="flex-1 px-5 py-6 space-y-5 overflow-y-auto pb-32">
                {/* Title */}
                <div>
                    <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 transition-colors">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-border dark:border-gray-800 bg-surface text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-400 transition-all"
                    />
                </div>

                {/* Answers */}
                {answers.map((ans) => (
                    <div key={ans.id}>
                        <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 transition-colors">
                            {STEP_LABELS[ans.step_key] ?? ans.step_key}
                        </label>
                        <textarea
                            value={editedAnswers[ans.id] ?? ans.answer}
                            onChange={(e) => setEditedAnswers((prev) => ({ ...prev, [ans.id]: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border-2 border-border dark:border-gray-800 bg-surface text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:border-brand-400 transition-all text-sm"
                        />
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-5 py-4 bg-surface border-t border-border safe-bottom transition-colors z-[60]">
                <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
                    저장하기
                </Button>
            </div>
        </div>
    );
}
