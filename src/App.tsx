import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { AuthView } from './components/auth/AuthView'
import { OnboardingView } from './components/onboarding/OnboardingView'
import { CustomerTicketView } from './components/customer/CustomerTicketView'
import { useAuthStore } from './store/authStore'
import { useTicketStore } from './store/ticketStore'

function AuthenticatedApp() {
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

  if (!profile) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  }

  if (!profile.full_name || profile.full_name.trim() === '') {
    return <OnboardingView />
  }

  return <MainLayout />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ticket/:ticketId" element={<CustomerTicketView />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
