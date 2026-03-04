import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { AuthView } from './components/auth/AuthView'
import { useAuthStore } from './store/authStore'
import { useTicketStore } from './store/ticketStore'

function App() {
  const { session, isLoading, initialize } = useAuthStore()
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

  return (
    <MainLayout />
  )
}

export default App
