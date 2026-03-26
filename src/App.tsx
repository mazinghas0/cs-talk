import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { AuthView } from './components/auth/AuthView'
import { OnboardingView } from './components/onboarding/OnboardingView'
import { WelcomeTour } from './components/onboarding/WelcomeTour'
import { useAuthStore } from './store/authStore'
import { useTicketStore } from './store/ticketStore'

const CustomerTicketView = lazy(() =>
  import('./components/customer/CustomerTicketView').then(m => ({ default: m.CustomerTicketView }))
)
const JoinWorkspaceView = lazy(() =>
  import('./components/workspace/JoinWorkspaceView').then(m => ({ default: m.JoinWorkspaceView }))
)

const PageLoading = () => (
  <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
)

const TOUR_KEY = 'cs_talk_tour_done'

function AuthenticatedApp() {
  const { session, isLoading, initialize, profile, currentWorkspace } = useAuthStore()
  const [tourDone, setTourDone] = useState(() => !!localStorage.getItem(TOUR_KEY))
  const { subscribeToChanges } = useTicketStore()
  const navigate = useNavigate()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!session || !currentWorkspace) return
    const unsubscribe = subscribeToChanges()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, currentWorkspace?.id])

  // 초대 링크 → 로그인 후 자동 복귀
  useEffect(() => {
    if (!session || isLoading) return
    const redirect = sessionStorage.getItem('join_redirect')
    if (redirect?.startsWith('/join/')) {
      sessionStorage.removeItem('join_redirect')
      navigate(redirect)
    }
  }, [session, isLoading, navigate])

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  }

  if (!session) {
    return <AuthView />
  }

  if (!profile) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  }

  if (!profile.full_name || profile.full_name.trim() === '') {
    return <OnboardingView />
  }

  if (!tourDone) {
    return <WelcomeTour onComplete={() => {
      localStorage.setItem(TOUR_KEY, '1')
      setTourDone(true)
    }} />
  }

  return <MainLayout />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ticket/:ticketId" element={<Suspense fallback={<PageLoading />}><CustomerTicketView /></Suspense>} />
        <Route path="/join/:code" element={<Suspense fallback={<PageLoading />}><JoinWorkspaceView /></Suspense>} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
