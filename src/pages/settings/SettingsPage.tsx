import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore, FontSize } from '@/store/uiStore';
import { downloadJSON } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { getLevelFromXP } from '@/types';
import { LogOut, Download, ChevronRight, User, Target, Star, Shield, Trash2, FileText } from 'lucide-react';

export function SettingsPage() {
    const navigate = useNavigate();
    const { user, profile, totalXP, signOut, dominantCategory } = useAuthStore();
    const { fontSize, setFontSize } = useUIStore();
    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

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
        if (!user) return;
        setDeleting(true);
        // 사용자 데이터 삭제
        await supabase.from('experiences').delete().eq('user_id', user.id);
        await supabase.from('daily_progress').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('user_id', user.id);

        // 로그아웃 처리
        await signOut();
        setDeleting(false);
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex flex-col min-h-full bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-gray-900">설정</h1>
            </div>

            <div className="px-5 py-5 space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white text-2xl font-extrabold shadow-inner">
                            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1">
                            <p className="font-extrabold text-gray-900 text-lg">{profile?.display_name ?? '이름 없음'}</p>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Star size={14} className="text-xp-500 fill-xp-400" />
                                <span className="text-sm font-semibold text-gray-600">Lv.{levelInfo.level} {levelInfo.label} · {totalXP} XP</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Items */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 mb-2 px-2 uppercase tracking-wider">계정 정보</h2>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <SettingItem
                            icon={<Target size={18} className="text-brand-500" />}
                            label="주간 목표"
                            value={`주 ${profile?.weekly_goal ?? 3}회`}
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
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-5">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                                <Star size={18} className="text-brand-500" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 text-sm">글자 크기</p>
                                <p className="text-xs text-gray-400">채팅 및 기록의 글자 크기를 조절합니다</p>
                            </div>
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                            {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setFontSize(size)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${fontSize === size
                                        ? 'bg-white shadow-sm text-brand-600'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {size === 'small' ? '작게' : size === 'medium' ? '보통' : '크게'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Trust & Security */}
                <div>
                    <h2 className="text-sm font-bold text-gray-400 mb-2 px-2 uppercase tracking-wider flex items-center gap-1">
                        <Shield size={14} /> 신뢰 및 보안
                    </h2>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col divide-y divide-gray-50">
                        <button
                            onClick={() => setShowPrivacyPolicy(true)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 pl-4 pr-5 transition-colors text-left"
                        >
                            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                                <FileText size={18} className="text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800 text-sm">개인정보 처리방침</p>
                                <p className="text-xs text-gray-400">데이터 처리 및 민감정보 보호 안내</p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-blue-50 pl-4 pr-5 transition-colors text-left"
                        >
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Download size={18} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm truncate">내 데이터 내보내기</p>
                                <p className="text-xs text-gray-400 truncate">JSON 파일로 안전하게 백업</p>
                            </div>
                            {exporting ? (
                                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            ) : (
                                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Account Actions */}
                <div className="pt-4 space-y-3">
                    <button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
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

                <p className="text-center text-xs text-gray-300 py-10">ValueLog v2.0 · Netlify + Supabase</p>
            </div>

            {/* Privacy Policy Modal */}
            {showPrivacyPolicy && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in px-4">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl animate-slide-up max-h-[85vh] flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-brand-500" size={24} />
                            <h3 className="text-lg font-extrabold text-gray-900">개인정보 처리방침</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-gray-600">
                            <div>
                                <h4 className="font-bold text-gray-900">1. 수집하는 개인정보 항목</h4>
                                <p>이메일, 표시되는 이름, 작성한 경험 기록(민감정보 포함 가능), 관심분야, 목표 설정 정보 등</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">2. 민감정보 보호</h4>
                                <p>경험 기록 내 건강, 신념 등 민감한 정보가 포함될 수 있으며, 해당 데이터는 암호화 전송 및 본인만 열람 가능한 형태로 처리하여 안전하게 보호합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">3. 아동 보호 (만 14세 미만)</h4>
                                <p>만 14세 미만의 아동인 경우, 정보주체(아동)의 정보 처리 전 법정대리인의 동의가 필수적으로 확인되어야 합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">4. 제3자 제공 및 국외 이전</h4>
                                <p>개인정보는 외부 사업자(예: 분석 API, 배포 서버 등) 연동을 위해 클라우드로 국외 이전(미국 등)되어 보관 및 처리될 수 있습니다. 회사는 데이터 보호법 관련 규제를 준수합니다.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">5. 사용자의 권리</h4>
                                <p>언제든지 설정 메뉴를 통해 자신의 모든 데이터를 JSON 형태로 다운로드하거나 자발적으로 삭제 및 계정 탈퇴 요청을 할 수 있습니다.</p>
                            </div>
                        </div>
                        <Button fullWidth onClick={() => setShowPrivacyPolicy(false)} className="mt-6 flex-shrink-0">
                            확인
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in px-4">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl animate-slide-up">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4 mx-auto">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 text-center mb-2">정말 탈퇴하시겠어요?</h3>
                        <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">
                            계정을 삭제하면 그동안 기록한 <strong className="text-red-500">모든 경험 데이터와 배지가 즉시 삭제</strong>되며 절대 복구할 수 없습니다.
                            <br /><br />필요하시다면 먼저 <strong className="text-gray-700">데이터를 내보내기</strong> 해주세요.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                            <Button variant="danger" fullWidth onClick={handleDeleteAccount} loading={deleting}>삭제하기</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sign Out Confirm Modal */}
            {showSignOutConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-end z-50 animate-fade-in">
                    <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl p-6 animate-slide-up pb-8">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-2">로그아웃 할까요?</h3>
                        <p className="text-gray-500 text-sm mb-6">다시 로그인하면 모든 기록을 볼 수 있어요.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setShowSignOutConfirm(false)}>취소</Button>
                            <Button variant="danger" fullWidth onClick={handleSignOut}>로그아웃</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 pl-4 pr-5 hover:bg-gray-50/50 transition-colors">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">{icon}</div>
            <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
        </div>
    );
}
