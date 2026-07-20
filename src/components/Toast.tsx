import { useToastStore } from '../store/useToastStore'

export function Toast() {
  const { message, visible } = useToastStore()
  return <div className={`toast ${visible ? 'show' : ''}`}>{message}</div>
}
