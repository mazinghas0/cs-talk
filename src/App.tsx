import { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { AuthView } from './components/auth/AuthView'
import { OnboardingView } from './components/onboarding/OnboardingView'
import { CustomerTicketView } from './components/customer/CustomerTicketView'
import { JoinWorkspaceView } from './components/workspace/JoinWorkspaceView'
import { useAuthStore } from './store/authStore'
import { useTicketStore } from './store/ticketStore'

// [임시 디버그] 실시간 구독 로그를 화면에 표시 — 확인 후 삭제 예정
function DebugPanel() {
  const [logs, setLogs] = useState<string[]>([])
  const [visible, setVisible] = useState(true)
  const originalLog = useRef(console.log)

  useEffect(() => {
    const orig = console.log
    originalLog.current = orig
    console.log = (...args: unknown[]) => {
      orig(...args)
      const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      if (msg.includes('[Realtime]')) {
        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20))
      }
    }
    return () => { console.log = orig }
  }, [])

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, padding: '6px 12px', background: '#1a1a2e', color: '#00ff88', border: '1px solid #00ff88', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
      >
        DEBUG
      </button>
    )
  }

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', color: '#00ff88', fontFamily: 'monospace', fontSize: 11, maxHeight: '40vh', overflowY: 'auto', padding: '8px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: '1px solid #333', paddingBottom: 4 }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>[임시] Realtime 디버그 로그</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setLogs([])} style={{ background: 'none', border: '1px solid #555', color: '#aaa', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>초기화</button>
          <button onClick={() => setVisible(false)} style={{ background: 'none', border: '1px solid #555', color: '#aaa', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>닫기</button>
        </div>
      </div>
      {logs.length === 0
        ? <div style={{ color: '#666' }}>로그 없음 — 앱 사용 시 여기에 표시됨</div>
        : logs.map((log, i) => <div key={i} style={{ marginBottom: 2, wordBreak: 'break-all' }}>{log}</div>)
      }
    </div>
  )
}

function AuthenticatedApp() {
  const { session, isLoading, initialize, profile, currentWorkspace } = useAuthStore()
  const { subscribeToChanges } = useTicketStore()

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
      <DebugPanel />
      <Routes>
        <Route path="/ticket/:ticketId" element={<CustomerTicketView />} />
        <Route path="/join/:code" element={<JoinWorkspaceView />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
