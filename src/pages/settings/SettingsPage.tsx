import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore, FontSize, Theme } from '@/store/uiStore';
import { downloadJSON } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { getLevelFromXP } from '@/types';
import { LogOut, Download, ChevronRight, User, Target, Star, Shield, Trash2, FileText, Moon, Sun, Lightbulb, Award } from 'lucide-react';

export function SettingsPage() {
    const navigate = useNavigate();
    const { user, profile, totalXP, signOut, dominantCategory, fetchProfile, userBadges } = useAuthStore();
    const { fontSize, setFontSize, theme, setTheme } = useUIStore();
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);

    // Weekly Goal Editor
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<number>(3);
    const [updatingGoal, setUpdatingGoal] = useState(false);

    const levelInfo = getLevelFromXP(totalXP, dominantCategory);

    const handleExport = async () => {
        if (!user) return;
        setExporting(true);
        const [{ data: experiences }, { data: answers }, { data: progress }, { data: badges }] = await Promise.all([
            supabase.from('experiences').select('*').eq('user_id', user.id),
            supabase.from('experience_answers').select('*'),
            supabase.from('daily_progress').select('*').eq('user_id', user.id),
            supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', user.id),
        ]);

        downloadJSON({
            exported_at: new Date().toISOString(),
            profile,
            experiences,
            answers,
            daily_progress: progress,
            user_badges: badges,
        }, `valuelog_export_${new Date().toISOString().split('T')[0]}.json`);
        setExporting(false);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    const handleDeleteAccount = async () => {
        if (!user || deleteEmailConfirm !== user.email) return;
        setDeleting(true);

        try {
            // 사용자 데이터 삭제
            const { error: expError } = await supabase.from('experiences').delete().eq('user_id', user.id);
            if (expError) console.error('Failed to delete experiences:', expError);

            const { error: dpError } = await supabase.from('daily_progress').delete().eq('user_id', user.id);
            if (dpError) console.error('Failed to delete daily_progress:', dpError);

            // RLS 정책으로 인해 profiles 테이블의 행 삭제가 허용되지 않을 수 있으므로, 닉네임을 비워 온보딩을 강제합니다.
            const { error: profError } = await supabase.from('profiles').update({ display_name: '', weekly_goal: 3 }).eq('user_id', user.id);
            if (profError) {
                console.error('Failed to reset profile:', profError);
            } else {
                // Delete actual profile if allowed
                await supabase.from('profiles').delete().eq('user_id', user.id);
            }

            // Supabase에서 유저 자체를 삭제하는 RPC 호출 시도 (설정되어 있다면)
            try {
                await supabase.rpc('delete_user');
            } catch (rpcErr) {
                console.warn('RPC delete user failed/missing', rpcErr);
            }

            // 로그아웃 처리
            // 온보딩과 튜토리얼을 다시 볼 수 있도록 로컬 데이터 완전 초기화
            localStorage.removeItem('tutorial_done');
            await signOut();
            setDeleting(false);
            setShowDeleteConfirm(false);
            setDeleteEmailConfirm('');
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Account deletion error:', error);
            alert('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            setDeleting(false);
        }
    };

    const handleUpdateGoal = async (newGoal: number) => {
        if (!user) return;
        setUpdatingGoal(true);
        const { error } = await supabase.from('profiles').update({ weekly_goal: newGoal }).eq('user_id', user.id);
        if (!error) {
            await fetchProfile(user.id);
            setShowGoalModal(false);
        } else {
            alert('목표 업데이트 중 오류가 발생했습니다.');
        }
        setUpdatingGoal(false);
    };

    const WEEKLY_GOALS = [
        { value: 2, label: '주 2회', desc: '가볍게 시작' },
        { value: 3, label: '주 3회', desc: '꾸준히 도전' },
        { value: 5, label: '주 5회', desc: '열심히 기록' },
        { value: 7, label: '매일', desc: '완전 몰입' },
    ];

    return (
        <div className="flex flex-col min-h-full bg-surface-2 pb-10 transition-colors duration-300">
            {/* Header */}
            <div className="bg-surface px-5 pt-12 pb-5 border-b border-border">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">설정</h1>
            </div>

            <div className="px-5 py-5 space-y-6">
                {/* Profile Card */}
                <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white text-2xl font-extrabold shadow-inner">
                            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1">
                            <p className="font-extrabold text-gray-900 dark:text-gray-100 text-lg transition-colors">{profile?.display_name ?? '이름 없음'}</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm transition-colors">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Star size={14} className="text-xp-500 fill-xp-400" />
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors">Lv.{levelInfo.level} {levelInfo.label} · {totalXP} XP</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Items */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-2 px-2 uppercase tracking-wider transition-colors">계정 정보</h2>
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm transition-colors">
                        <SettingItem
                            icon={<Target size={18} className="text-brand-500" />}
                            label="주간 목표 (클릭하여 수정)"
                            value={`주 ${profile?.weekly_goal ?? 3}회`}
                            onClick={() => {
                                setEditingGoal(profile?.weekly_goal ?? 3);
                                setShowGoalModal(true);
                            }}
                        />
                        <SettingItem
                            icon={<Award size={18} className="text-brand-500" />}
                            label="획득한 배지"
                            value={`${userBadges.length}개`}
                            onClick={() => navigate('/badges')}
                        />
                        <SettingItem
                            icon={<User size={18} className="text-brand-500" />}
                            label="이메일"
                            value={user?.email ?? '-'}
                        />
                    </div>
                </div>

                {/* Display Preferences */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 mb-2 px-2 uppercase tracking-wider">화면 설정</h2>
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm p-5 space-y-6 transition-colors">
                        {/* Font Size */}
                        <div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-8 h-8 bg-brand-50 dark:bg-brand-950/20 rounded-lg flex items-center justify-center transition-colors">
                                    <Star size={18} className="text-brand-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm transition-colors">글자 크기</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">채팅 및 기록의 글자 크기를 조절합니다</p>
                                </div>
                            </div>
                            <div className="flex gap-2 p-1 bg-surface-2 rounded-xl transition-colors">
                                {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setFontSize(size)}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${fontSize === size
                                            ? 'bg-surface shadow-sm text-brand-600 dark:text-brand-400'
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theme */}
                        <div>
                            <div className="flex items-center gap-4 mb-4 pt-4 border-t border-border transition-colors">
                                <div className="w-8 h-8 bg-brand-50 dark:bg-brand-950/20 rounded-lg flex items-center justify-center transition-colors">
                                    {theme === 'dark' ? <Moon size={18} className="text-brand-500" /> : <Sun size={18} className="text-brand-500" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm transition-colors">페이지 색상</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">앱의 서비스 테마를 변경합니다</p>
                                </div>
                            </div>
                            <div className="flex gap-2 p-1 bg-surface-2 rounded-xl transition-colors">
                                {(['light', 'dark'] as Theme[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${theme === t
                                            ? 'bg-surface shadow-sm text-brand-600 dark:text-brand-400'
                                            : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {t === 'light' ? '화이트모드' : '다크모드'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* App Guide */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-2 px-2 uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Lightbulb size={14} /> 이용 안내
                    </h2>
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col divide-y divide-border transition-colors">
                        <button
                            onClick={() => navigate('/quest', { state: { category: 'daily', isTutorial: true } })}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 pl-4 pr-5 transition-colors text-left"
                        >
                            <div className="w-8 h-8 bg-brand-50 dark:bg-brand-950/20 rounded-lg flex items-center justify-center transition-colors">
                                <Lightbulb size={18} className="text-brand-500" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm transition-colors">튜토리얼 다시보기</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">안내에 따라 기록 과정을 체험해보세요</p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Trust & Security */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-2 px-2 uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Shield size={14} /> 신뢰 및 보안
                    </h2>
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col divide-y divide-border transition-colors">
                        <button
                            onClick={() => setShowPrivacyPolicy(true)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 pl-4 pr-5 transition-colors text-left"
                        >
                            <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center transition-colors">
                                <FileText size={18} className="text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm transition-colors">개인정보 처리방침</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 transition-colors">데이터 처리 및 민감정보 보호 안내</p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 transition-colors" />
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 pl-4 pr-5 transition-colors text-left"
                        >
                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center transition-colors">
                                <Download size={18} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate transition-colors">내 데이터 내보내기</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate transition-colors">JSON 파일로 안전하게 백업</p>
                            </div>
                            {exporting ? (
                                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            ) : (
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0 transition-colors" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Account Actions */}
                <div className="pt-4 space-y-3">
                    <button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="w-full bg-surface border border-border text-gray-700 dark:text-gray-200 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-surface-2 transition-colors"
                    >
                        <LogOut size={18} />
                        로그아웃
                    </button>

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full bg-transparent text-gray-400 text-sm font-semibold py-2 flex items-center justify-center gap-2 hover:text-red-500 transition-colors"
                    >
                        데이터 삭제 및 탈퇴
                    </button>
                </div>

                <p className="text-center text-xs text-gray-300 dark:text-gray-600 py-10 transition-colors">ValueLog v2.0 · Firebase + Supabase</p>
            </div>

            {/* Privacy Policy Modal - rendered via portal to clear BottomNav stacking context */}
            {showPrivacyPolicy && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in px-4">
                    <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-xl animate-slide-up max-h-[85vh] flex flex-col transition-colors">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-brand-500" size={24} />
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">개인정보 처리방침</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">1. 수집하는 개인정보 항목</h4>
                                <p>이메일, 표시되는 이름, 작성한 경험 기록(민감정보 포함 가능), 관심분야, 목표 설정 정보 등</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">2. 민감정보 보호</h4>
                                <p>경험 기록 내 건강, 신념 등 민감한 정보가 포함될 수 있으며, 해당 데이터는 암호화 전송 및 본인만 열람 가능한 형태로 처리하여 안전하게 보호합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">3. 아동 보호 (만 14세 미만)</h4>
                                <p>만 14세 미만의 아동인 경우, 정보주체(아동)의 정보 처리 전 법정대리인의 동의가 필수적으로 확인되어야 합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">4. 제3자 제공 및 국외 이전</h4>
                                <p>개인정보는 외부 사업자(예: 분석 API, 배포 서버 등) 연동을 위해 클라우드로 국외 이전(미국 등)되어 보관 및 처리될 수 있습니다. 회사는 데이터 보호법 관련 규제를 준수합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">5. 사용자의 권리</h4>
                                <p>언제든지 설정 메뉴를 통해 자신의 모든 데이터를 JSON 형태로 다운로드하거나 자발적으로 삭제 및 계정 탈퇴 요청을 할 수 있습니다.</p>
                            </div>
                        </div>
                        <Button fullWidth onClick={() => setShowPrivacyPolicy(false)} className="mt-6 flex-shrink-0">
                            확인
                        </Button>
                    </div>
                </div>
                , document.body)}

            {/* Delete Confirm Modal - rendered via portal */}
            {showDeleteConfirm && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in px-4">
                    <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-xl animate-slide-up transition-colors">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center mb-4 mx-auto">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 text-center mb-2">정말 탈퇴하시겠어요?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6 leading-relaxed">
                            계정을 삭제하면 그동안 기록한 <strong className="text-red-500">모든 경험 데이터와 배지가 즉시 삭제</strong>되며 절대 복구할 수 없습니다.
                            <br /><br />탈퇴하시려면 아래에 본인의 이메일 <strong>({user?.email})</strong>을 정확히 입력해 주세요.
                        </p>
                        <div className="mb-6">
                            <input
                                type="text"
                                placeholder={user?.email}
                                value={deleteEmailConfirm}
                                onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-2 dark:bg-gray-800 text-center text-sm focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteEmailConfirm('');
                            }}>취소</Button>
                            <Button variant="danger" fullWidth onClick={handleDeleteAccount} loading={deleting} disabled={deleteEmailConfirm !== user?.email}>삭제 및 탈퇴</Button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* Sign Out Confirm Modal - rendered via portal above BottomNav */}
            {showSignOutConfirm && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-end animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="w-full max-w-[480px] mx-auto bg-surface rounded-t-3xl p-6 animate-slide-up transition-colors"
                        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px) + 72px)' }}>
                        <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">로그아웃 할까요?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">다시 로그인하면 모든 기록을 볼 수 있어요.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setShowSignOutConfirm(false)}>취소</Button>
                            <Button variant="danger" fullWidth onClick={handleSignOut}>로그아웃</Button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* Goal Edit Modal */}
            {showGoalModal && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in px-4">
                    <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-xl animate-slide-up transition-colors">
                        <div className="flex items-center gap-2 mb-6">
                            <Target className="text-brand-500" size={24} />
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">주간 목표 설정</h3>
                        </div>
                        <div className="space-y-3 mb-6">
                            {WEEKLY_GOALS.map(({ value, label, desc }) => (
                                <button
                                    key={value}
                                    onClick={() => handleUpdateGoal(value)}
                                    disabled={updatingGoal}
                                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${editingGoal === value
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                                        : 'border-border bg-surface text-gray-700 dark:text-gray-300 hover:border-brand-100 dark:hover:border-brand-900/40'
                                        }`}
                                >
                                    <span className="font-bold text-lg">{label}</span>
                                    <span className={`text-sm ${editingGoal === value ? 'text-brand-500' : 'text-gray-400 dark:text-gray-500'}`}>{desc}</span>
                                </button>
                            ))}
                        </div>
                        <Button variant="secondary" fullWidth onClick={() => setShowGoalModal(false)} disabled={updatingGoal}>
                            닫기
                        </Button>
                    </div>
                </div>
                , document.body)}

            {/* Guide Modal */}
            {showGuideModal && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in px-4">
                    <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-xl animate-slide-up max-h-[85vh] flex flex-col transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">기록 100% 활용 가이드</h3>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">ValueLog로 어떻게 성장할 수 있을까요?</p>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6">
                            <div className="bg-surface-2 p-4 rounded-2xl border border-border dark:border-gray-800 transition-colors flex gap-3">
                                <div className="text-2xl mt-0.5">📸</div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm transition-colors">활동 사진 남기기</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">텍스트 기록이 끝나면, 증명할 수 있는 사진을 사진첩 또는 카메라에서 자유롭게 불러올 수 있어요.</p>
                                </div>
                            </div>
                            <div className="bg-surface-2 p-4 rounded-2xl border border-border dark:border-gray-800 transition-colors flex gap-3">
                                <div className="text-2xl mt-0.5">🔗</div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm transition-colors">기록을 더욱 단단하게 (강화)</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">사진을 남긴 뒤, 세부적인 성과를 수치(객관적 변화량)나 결과물 링크(SNS, 블로그)로 추가해 신뢰도를 올리세요!</p>
                                </div>
                            </div>
                            <div className="bg-surface-2 p-4 rounded-2xl border border-border dark:border-gray-800 transition-colors flex gap-3">
                                <div className="text-2xl mt-0.5">⭐</div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm transition-colors">비약적인 기록의 가치, 역량 체크</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">행동 체크리스트를 통해 실제 어떤 역량(문제해결력, 창의성 등)을 발휘했는지 구체화하고 추가 경험치를 획득하세요.</p>
                                </div>
                            </div>
                        </div>

                        <Button fullWidth onClick={() => {
                            setShowGuideModal(false);
                            navigate('/quest', { state: { category: 'daily', isTutorial: true } });
                        }} className="flex-shrink-0">
                            튜토리얼 시작하기
                        </Button>
                    </div>
                </div>
                , document.body)}
        </div>
    );
}

function SettingItem({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 pl-4 pr-5 transition-colors ${onClick ? 'cursor-pointer hover:bg-surface-2' : ''}`}
        >
            <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center transition-colors">{icon}</div>
            <div className="flex-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-0.5 transition-colors">{label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors">{value}</p>
            </div>
            {onClick && <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 transition-colors" />}
        </div>
    );
}
