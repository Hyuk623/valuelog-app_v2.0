import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, DailyProgress, UserBadge } from '@/types';
import { getLocalDateKST } from '@/types';

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
    dailyProgress: DailyProgress | null;
    userBadges: UserBadge[];
    totalXP: number;
    dominantCategory: string | null;
    frequentCategories: string[];

    // Actions
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    fetchProfile: (userId: string) => Promise<void>;
    fetchDailyProgress: (userId: string) => Promise<void>;
    fetchUserBadges: (userId: string) => Promise<void>;
    fetchTotalXP: (userId: string) => Promise<void>;
    fetchDominantCategory: (userId: string) => Promise<void>;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProgress: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    profile: null,
    loading: true,
    initialized: false,
    dailyProgress: null,
    userBadges: [],
    totalXP: 0,
    dominantCategory: null,
    frequentCategories: [],

    setUser: (user) => set({ user }),
    setSession: (session) => set({ session }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),

    fetchProfile: async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (data) set({ profile: data as Profile });
    },

    fetchDailyProgress: async (userId: string) => {
        const today = getLocalDateKST();
        const { data } = await supabase
            .from('daily_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('local_date', today)
            .single();
        set({ dailyProgress: data as DailyProgress | null });
    },

    fetchUserBadges: async (userId: string) => {
        const { data } = await supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', userId);
        set({ userBadges: (data as UserBadge[]) ?? [] });
    },

    fetchTotalXP: async (userId: string) => {
        const { data } = await supabase
            .from('daily_progress')
            .select('xp_total')
            .eq('user_id', userId);
        const total = (data ?? []).reduce((sum: number, row: { xp_total: number }) => sum + (row.xp_total ?? 0), 0);
        set({ totalXP: total });
    },

    fetchDominantCategory: async (userId: string) => {
        const { data } = await supabase
            .from('experiences')
            .select('category')
            .eq('user_id', userId);

        if (!data || data.length === 0) {
            set({ dominantCategory: null, frequentCategories: [] });
            return;
        }

        const counts = data.reduce<Record<string, number>>((acc, row) => {
            acc[row.category] = (acc[row.category] || 0) + 1;
            return acc;
        }, {});

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        set({ dominantCategory: sorted[0] || null, frequentCategories: sorted });
    },

    initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        set({ session, user, loading: false });

        if (user) {
            await Promise.all([
                get().fetchProfile(user.id),
                get().fetchDailyProgress(user.id),
                get().fetchUserBadges(user.id),
                get().fetchTotalXP(user.id),
                get().fetchDominantCategory(user.id),
            ]);
        }

        // profile 로딩 완료 후 initialized → 라우팅 플래시 방지
        set({ initialized: true });

        supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user ?? null;
            set({ session, user });
            if (user) {
                get().fetchProfile(user.id);
                get().fetchDailyProgress(user.id);
                get().fetchUserBadges(user.id);
                get().fetchTotalXP(user.id);
                get().fetchDominantCategory(user.id);
            } else {
                set({ profile: null, dailyProgress: null, userBadges: [], totalXP: 0, dominantCategory: null, frequentCategories: [] });
            }
        });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null, dailyProgress: null, userBadges: [], totalXP: 0, dominantCategory: null, frequentCategories: [] });
    },

    refreshProgress: async () => {
        const { user } = get();
        if (!user) return;
        await Promise.all([
            get().fetchDailyProgress(user.id),
            get().fetchUserBadges(user.id),
            get().fetchTotalXP(user.id),
            get().fetchDominantCategory(user.id),
        ]);
    },
}));
