import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** 환경 변수가 비어 있으면 랜딩에서 안내만 하고 인증은 비활성화한다 */
export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  // 개발 중 설정 누락을 바로 알아채도록 콘솔에 남긴다
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요.',
  )
}

// 값이 없어도 createClient 자체는 던지지 않도록 더미 문자열을 넣는다.
// (supabaseConfigured 로 실제 호출을 막는다)
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
)
