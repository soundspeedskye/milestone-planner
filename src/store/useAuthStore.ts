import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'

const ALLOWED_DOMAIN = 'safience.com'
export const emailAllowed = (email: string) =>
  new RegExp(`^[^@\\s]+@${ALLOWED_DOMAIN}$`, 'i').test(email.trim())

/** Supabase 에러 메시지를 한국어로 정리 */
function friendlyError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 올바르지 않아요.'
  if (m.includes('already registered') || m.includes('already been registered')) return '이미 가입된 이메일이에요.'
  if (m.includes('password should be at least')) return '비밀번호는 6자 이상이어야 해요.'
  if (m.includes('safience.com')) return `${ALLOWED_DOMAIN} 도메인 이메일만 가입할 수 있어요.`
  if (m.includes('email') && m.includes('invalid')) return '올바른 이메일 형식이 아니에요.'
  return message
}

interface AuthState {
  session: Session | null
  user: User | null
  /** 최초 세션 복원 전까지 true — 화면 깜빡임 방지 */
  loading: boolean
  configured: boolean
  init: () => void
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  configured: supabaseConfigured,

  init: () => {
    if (!supabaseConfigured) {
      set({ loading: false })
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, loading: false })
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false })
    })
  },

  signUp: async (email, password) => {
    if (!emailAllowed(email)) throw new Error(`${ALLOWED_DOMAIN} 도메인 이메일만 가입할 수 있어요.`)
    const { error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) throw new Error(friendlyError(error.message))
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(friendlyError(error.message))
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },
}))
