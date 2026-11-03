import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState, ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/features/home/NotFoundPage';
import { basePath } from '@/lib/env';
import { createQueryClient } from '@/lib/queryClient';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const LibraryPage = lazy(() => import('@/features/games/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const GameDetailPage = lazy(() => import('@/features/games/GameDetailPage').then((m) => ({ default: m.GameDetailPage })));
const LorePage = lazy(() => import('@/features/lore/LorePage').then((m) => ({ default: m.LorePage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const EventsPage = lazy(() => import('@/features/events/EventsPage').then((m) => ({ default: m.EventsPage })));
const ComponentsPage = lazy(() => import('@/features/docs/ComponentsPage').then((m) => ({ default: m.ComponentsPage })));

export function AppRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<div className="container section"><LoadingState /></div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/games/:slug" element={<GameDetailPage />} />
          <Route path="/lore" element={<LorePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/ui" element={<ComponentsPage />} />
          <Route path="/biblioteca" element={<Navigate to="/library" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter basename={basePath}>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
