import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import ProtectedRoute from './components/ProtectedRoute'
import { scheduleAllForgeReminders } from './services/notificationScheduler'
import { useAuthStore } from './store/authStore'
import api from './lib/api'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

// App pages
import DashboardPage from './pages/DashboardPage'
import GoalsPage from './pages/GoalsPage'
import GoalDetailPage from './pages/GoalDetailPage'
import NewGoalPage from './pages/NewGoalPage'
import HabitsPage from './pages/HabitsPage'
import HabitDetailPage from './pages/HabitDetailPage'
import NewHabitPage from './pages/NewHabitPage'
import JournalPage from './pages/JournalPage'
import JournalDetailPage from './pages/JournalDetailPage'
import NewJournalPage from './pages/NewJournalPage'
import WeeklyReviewPage from './pages/WeeklyReviewPage'

export default function App() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Sync the user's real timezone with the backend (silent, zero-config).
    //    Uses the browser/device's IANA timezone from Intl, which is always correct.
    const syncTimezone = async () => {
      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detectedTimezone) {
          await api.put('/auth/me/timezone', { timezone: detectedTimezone });
        }
      } catch {
        // Non-critical — silently ignore if it fails
      }
    };
    syncTimezone();

    // 2. Schedule local notifications on native platforms
    const setupNotifications = async () => {
      if (!Capacitor.isNativePlatform()) return;
      const permStatus = await LocalNotifications.requestPermissions();
      if (permStatus.display !== 'granted') return;
      await scheduleAllForgeReminders();
    };
    setupNotifications();
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/goals/new" element={<NewGoalPage />} />
          <Route path="/goals/:id" element={<GoalDetailPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/new" element={<NewHabitPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/new" element={<NewJournalPage />} />
          <Route path="/journal/:id" element={<JournalDetailPage />} />
          <Route path="/review" element={<WeeklyReviewPage />} />
        </Route>

        {/* Redirect root */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
