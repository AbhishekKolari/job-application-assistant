import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { useAuthStore } from '../store/auth'

export const AuthCallbackPage = () => {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const { setToken, fetchProfile } = useAuthStore()

  useEffect(() => {
    if (token) {
      setToken(token)
      fetchProfile().finally(() => {
        navigate('/', { replace: true })
      })
    } else {
      navigate('/', { replace: true })
    }
  }, [token, setToken, fetchProfile, navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-body)' }}>
      <div className="glass-card" style={{ padding: '2rem 3rem', textAlign: 'center' }}>
        <Loader2 className="spin" size={32} />
        <p style={{ marginTop: '1rem' }}>Completing sign-in…</p>
      </div>
    </div>
  )
}
