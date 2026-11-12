import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState, ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/features/home/NotFoundPage';
import { basePath } from '@/lib/env';
import { RouteSeo } from '@/seo/RouteSeo';
import { I18nProvider, LangBoundary } from '@/i18n';
import { createQueryClient } from '@/lib/queryClient';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const GamesPage = lazy(() => import('@/features/games/GamesPage').then((m) => ({ default: m.GamesPage })));
const GameDetailPage = lazy(() => import('@/features/games/GameDetailPage').then((m) => ({ default: m.GameDetailPage })));
const BggImportPage = lazy(() => import('@/features/bgg/BggImportPage').then((m) => ({ default: m.BggImportPage })));
const LorePage = lazy(() => import('@/features/lore/LorePage').then((m) => ({ default: m.LorePage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PlayerPage = lazy(() => import('@/features/players/PlayerPage').then((m) => ({ default: m.PlayerPage })));
const EventsPage = lazy(() => import('@/features/events/EventsPage').then((m) => ({ default: m.EventsPage })));
const FateDrawPage = lazy(() => import('@/features/fate/FateDrawPage').then((m) => ({ default: m.FateDrawPage })));
const CommunitiesPage = lazy(() => import('@/features/communities/CommunitiesPage').then((m) => ({ default: m.CommunitiesPage })));
const NewCommunityPage = lazy(() => import('@/features/communities/NewCommunityPage').then((m) => ({ default: m.NewCommunityPage })));
const FindCommunityPage = lazy(() => import('@/features/communities/FindCommunityPage').then((m) => ({ default: m.FindCommunityPage })));
const CommunityPage = lazy(() => import('@/features/communities/CommunityPage').then((m) => ({ default: m.CommunityPage })));
const ComponentsPage = lazy(() => import('@/features/docs/ComponentsPage').then((m) => ({ default: m.ComponentsPage })));

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/fate"
        element={<RequireAuth><Suspense fallback={<div className="container section"><LoadingState /></div>}><FateDrawPage /></Suspense></RequireAuth>}
      />
      <Route path="*" element={<ShellRoutes />} />
    </Routes>
  );
}

function ShellRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<div className="container section"><LoadingState /></div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage mode="register" />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/import" element={<RequireAuth><BggImportPage /></RequireAuth>} />
          <Route path="/games/:slug" element={<GameDetailPage />} />
          <Route path="/lore" element={<LorePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/find-community" element={<RequireAuth><FindCommunityPage /></RequireAuth>} />
          <Route path="/communities/new" element={<RequireAuth><NewCommunityPage /></RequireAuth>} />
          <Route path="/communities/:slug" element={<CommunityPage />} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/players/:id" element={<PlayerPage />} />
          {import.meta.env.DEV && <Route path="/ui" element={<ComponentsPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <LangBoundary>
              <BrowserRouter basename={basePath}>
                <RouteSeo />
                <AppRoutes />
              </BrowserRouter>
            </LangBoundary>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
