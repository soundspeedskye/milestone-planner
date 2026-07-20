import { create } from 'zustand'

interface ToastState {
  message: string
  visible: boolean
  show: (msg: string) => void
}

let hideTimer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastState>(set => ({
  message: '',
  visible: false,
  show: msg => {
    clearTimeout(hideTimer)
    set({ message: msg, visible: true })
    hideTimer = setTimeout(() => set({ visible: false }), 2000)
  },
}))
