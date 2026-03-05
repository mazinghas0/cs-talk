import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { AuthView } from './components/auth/AuthView'
import { OnboardingView } from './components/onboarding/OnboardingView'
import { useAuthStore } from './store/authStore'
import { useTicketStore } from './store/ticketStore'

function App() {
  const { session, isLoading, initialize, profile } = useAuthStore()
  const { subscribeToChanges } = useTicketStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (session) {
      const unsubscribe = subscribeToChanges()
      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
  }, [session, subscribeToChanges])

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  }

  if (!session) {
    return <AuthView />
  }

  // 세션은 있지만 프로필이 아직 로드 중인 경우 대기
  if (!profile) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  }

  // 이름이 없으면 온보딩 강제
  if (!profile.full_name || profile.full_name.trim() === '') {
    return <OnboardingView />
  }

  return (
    <MainLayout />
  )
}

export default App
