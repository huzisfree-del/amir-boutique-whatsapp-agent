import { create } from 'zustand'
import { api } from '../api'

export const useAuth = create((set) => ({
  user: null,
  branch: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('pos_token')
    if (!token) { set({ loading: false }); return }
    try {
      const { user, branch } = await api.me()
      set({ user, branch, loading: false })
    } catch {
      localStorage.removeItem('pos_token')
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    const { token, user, branch } = await api.login({ email, password })
    localStorage.setItem('pos_token', token)
    set({ user, branch })
  },

  logout: () => {
    localStorage.removeItem('pos_token')
    set({ user: null, branch: null })
  },

  setBranch: (branch) => set({ branch }),
}))
