import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Layout } from '@/components/layout/Layout';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';

// Main pages
import { HomePage } from '@/pages/home/HomePage';
import { QuestPage } from '@/pages/quest/QuestPage';
import { TimelinePage } from '@/pages/timeline/TimelinePage';
import { ExperienceDetailPage } from '@/pages/timeline/ExperienceDetailPage';
import { ExperienceEditPage } from '@/pages/timeline/ExperienceEditPage';
import { BadgesPage } from '@/pages/badges/BadgesPage';
import { StatsPage } from '@/pages/stats/StatsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

function AppRouter() {
  const { user, profile, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  // Theme Sync
  const { theme } = useUIStore();
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
  }, [theme]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white gap-4">
        <img src="/favicon.svg?v=2" alt="ValueLog Logo" className="w-[84px] h-[84px] shadow-sm rounded-full bg-white mb-2 animate-bounce" />
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // User logged in but no profile (or empty display_name) → onboarding
  if (!profile?.display_name) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/timeline/:id" element={<ExperienceDetailPage />} />
        <Route path="/timeline/:id/edit" element={<ExperienceEditPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/badges" element={<BadgesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Quest is full-screen, outside Layout */}
      <Route path="/quest" element={<QuestPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
