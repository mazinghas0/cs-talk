import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { AuthView } from './components/auth/AuthView'
import { useAuthStore } from './store/authStore'

function App() {
  const { session, isLoading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

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
