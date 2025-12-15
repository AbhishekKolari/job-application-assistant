import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { apiClient } from '../api/client'
import type { UserProfile } from '../types'

interface AuthState {
  token: string | null
  user: UserProfile | null
  isFetchingProfile: boolean
  setToken: (token: string | null) => void
  fetchProfile: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isFetchingProfile: false,
      setToken: (token) => {
        set({ token })
      },
      fetchProfile: async () => {
        if (!get().token) return
        try {
          set({ isFetchingProfile: true })
          const { data } = await apiClient.get<UserProfile>('/auth/me')
          set({ user: data })
        } catch (error) {
          console.error('Failed to fetch profile', error)
          set({ token: null, user: null })
        } finally {
          set({ isFetchingProfile: false })
        }
      },
      loginWithGoogle: async () => {
        const redirectUrl = `${window.location.origin}/auth/callback`
        const { data } = await apiClient.get<{ url: string }>('/auth/google/url', {
          params: { redirect: redirectUrl },
        })
        window.location.href = data.url
      },
      logout: () => {
        set({ token: null, user: null })
      },
    }),
    {
      name: 'jobflow-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
