import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { useProgress } from './hooks/useProgress';
import AchievementsPage from './pages/AchievementsPage';
import HomePage from './pages/HomePage';
import LearnPage from './pages/LearnPage';
import LessonPage from './pages/LessonPage';
import NotFoundPage from './pages/NotFoundPage';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import TestPage from './pages/TestPage';
import WelcomePage from './pages/WelcomePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function HomeRoute() {
  const { state } = useProgress();
  if (!state.onboarded) return <Navigate to="/welcome" replace />;
  return <HomePage />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/:lessonId" element={<LessonPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="test" element={<TestPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
