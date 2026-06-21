import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'
import { tokenStore } from '../lib/tokenStore'

interface User {
  id: string
  name: string
  email: string
  plan: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          // On native, token comes in response body; api.ts interceptor stores it
          set({ user: data.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/register', { name, email, password })
          // On native, token comes in response body; api.ts interceptor stores it
          set({ user: data.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // Silent fail – cookie will expire
        } finally {
          tokenStore.clear() // Clear stored Bearer token on native
          set({ user: null, isAuthenticated: false })
        }
      },

      checkAuth: async () => {
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data.user, isAuthenticated: true })
        } catch {
          tokenStore.clear()
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'forge-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
