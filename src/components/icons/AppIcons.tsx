/**
 * 앱 전역 아이콘 (Accent Two-Tone).
 *
 * 24px 그리드. 두 가지 규칙만 지킨다.
 *  1. 몸통은 currentColor — 진한 면은 그대로, 옅은 면은 투명도 35%.
 *     버튼·배너의 글자 색을 그대로 따르므로 호버·비활성·검은 버튼 위에서 자동으로 맞는다.
 *  2. 의미가 있는 한 조각에만 액센트 색을 쓴다. 네 가지뿐이다.
 *     파랑 = 정보·시간 / 앰버 = 주의 / 빨강 = 고정 / 초록 = 되돌리기
 *
 * 액센트는 CSS 변수(--icon-blue 등)라 어두운 표면에서 global.css 가 밝은 값으로 덮는다.
 * 간트 아이콘만 직군 막대 색 3개를 그대로 쓴다 (앱의 정체성이라 뉴트럴로 죽이지 않는다).
 */
import type { ReactNode } from 'react'

const BLUE = 'var(--icon-blue)'
const AMBER = 'var(--icon-amber)'
const RED = 'var(--icon-red)'
const GREEN = 'var(--icon-green)'

/** 몸통의 옅은 면. 글자 색을 그대로 쓰되 투명도만 낮춘다 */
const SOFT = 0.35

interface IconProps {
  /** 렌더 크기(px). 기본 20 */
  size?: number
  className?: string
  /** 접근성 라벨. 없으면 장식용(aria-hidden) */
  title?: string
}

function Svg({
  size = 20,
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

/** 설정 · 슬라이더 (톱니는 작아지면 그냥 원이 되어 슬라이더로 바꿨다) */
export function GearIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <g fill="currentColor" opacity={SOFT}>
        <rect x="3.2" y="5.6" width="17.6" height="1.8" rx=".9" />
        <rect x="3.2" y="11.1" width="17.6" height="1.8" rx=".9" />
        <rect x="3.2" y="16.6" width="17.6" height="1.8" rx=".9" />
      </g>
      <g fill={BLUE}>
        <circle cx="14.4" cy="6.5" r="2.7" />
        <circle cx="9.6" cy="12" r="2.7" />
        <circle cx="14.4" cy="17.5" r="2.7" />
      </g>
    </Svg>
  )
}

/** 버전 · 시계 */
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity={SOFT} />
      <path
        d="M12.95 6.9a.95.95 0 0 0-1.9 0v5.4c0 .33.17.63.45.8l3.4 2.05a.95.95 0 0 0 .98-1.63L12.95 11.7Z"
        fill={BLUE}
      />
    </Svg>
  )
}

/** 저장 · 내려받기 화살표 (실제 동작이 JSON 다운로드라 플로피보다 맞다) */
export function DiskIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.8" y="18" width="16.4" height="2.2" rx="1.1" fill="currentColor" opacity={SOFT} />
      <path
        d="M12.95 3.9a.95.95 0 0 0-1.9 0v8.24L8.6 9.7a.95.95 0 1 0-1.35 1.34l4.08 4.08a.95.95 0 0 0 1.34 0l4.08-4.08A.95.95 0 0 0 15.4 9.7l-2.45 2.44Z"
        fill={BLUE}
      />
    </Svg>
  )
}

/** 수정 · 연필 */
export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.2 16.4 14.9 4.7l4.4 4.4L7.6 20.8l-4.9 1 .5-5.4Z" fill="currentColor" />
      <path
        d="M16.1 3.5a2.6 2.6 0 0 1 3.7 0l.7.7a2.6 2.6 0 0 1 0 3.7l-1 1-4.4-4.4Z"
        fill={AMBER}
      />
    </Svg>
  )
}

/** 보기 · 눈 */
export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M12 5.3c-5.2 0-9.4 6.7-9.4 6.7s4.2 6.7 9.4 6.7 9.4-6.7 9.4-6.7S17.2 5.3 12 5.3Z"
        fill="currentColor"
        opacity={SOFT}
      />
      <circle cx="12" cy="12" r="3.4" fill={AMBER} />
    </Svg>
  )
}

/** 잠금 · 자물쇠 */
export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4.2" y="10.2" width="15.6" height="10.5" rx="2.8" fill="currentColor" opacity={SOFT} />
      <path
        d="M12 2.6a5 5 0 0 0-5 5v3.6h2V7.6a3 3 0 0 1 6 0v3.6h2V7.6a5 5 0 0 0-5-5Z"
        fill="currentColor"
      />
      <circle cx="12" cy="15.4" r="2.5" fill={AMBER} />
    </Svg>
  )
}

/** 캘린더 */
export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.2" y="5" width="17.6" height="15.8" rx="3" fill="currentColor" opacity={SOFT} />
      <path d="M3.2 8a3 3 0 0 1 3-3h11.6a3 3 0 0 1 3 3v1.6H3.2Z" fill={BLUE} />
      <rect x="6.9" y="2.4" width="2" height="4.6" rx="1" fill={BLUE} />
      <rect x="15.1" y="2.4" width="2" height="4.6" rx="1" fill={BLUE} />
    </Svg>
  )
}

/** 시작일 고정 · 압정 */
export function PinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M9.2 3.2h5.6a1 1 0 0 1 1 1.1l-.7 4.9 3.1 2.8a1 1 0 0 1 .3.7v.9a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-.9a1 1 0 0 1 .3-.7l3.1-2.8-.7-4.9a1 1 0 0 1 1-1.1Z"
        fill={RED}
      />
      <rect x="11" y="14.6" width="2" height="6.4" rx="1" fill="currentColor" opacity={SOFT} />
    </Svg>
  )
}

/** 꺼내기 · 이젝트 */
export function EjectIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M11.2 4.9a1 1 0 0 1 1.6 0l6.3 8a1 1 0 0 1-.8 1.6H5.7a1 1 0 0 1-.8-1.6Z"
        fill={GREEN}
      />
      <rect x="5.2" y="17.2" width="13.6" height="2.6" rx="1.3" fill="currentColor" opacity={SOFT} />
    </Svg>
  )
}

/** 복원 · 되감기 */
export function RestoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path
        d="M3 12a9 9 0 1 0 2.64-6.36"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity={SOFT}
      />
      <path
        d="M3.2 3.2a1 1 0 0 0-1 1v4.4a1 1 0 0 0 1 1h4.4a1 1 0 0 0 0-2H4.2V4.2a1 1 0 0 0-1-1Z"
        fill={BLUE}
      />
    </Svg>
  )
}

/** 프로젝트 목록 · 2×2 카드 */
export function GridIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.4" y="3.4" width="7.8" height="7.8" rx="2.4" fill={BLUE} />
      <rect x="12.8" y="3.4" width="7.8" height="7.8" rx="2.4" fill="currentColor" opacity={SOFT} />
      <rect x="3.4" y="12.8" width="7.8" height="7.8" rx="2.4" fill="currentColor" opacity={SOFT} />
      <rect x="12.8" y="12.8" width="7.8" height="7.8" rx="2.4" fill={BLUE} />
    </Svg>
  )
}

/** 간트 · 직군 막대 3줄 (여기만 직군색을 그대로 쓴다) */
export function ChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.2" y="4.8" width="11" height="4.2" rx="2.1" fill="#6EA8E4" />
      <rect x="7.4" y="9.9" width="13.4" height="4.2" rx="2.1" fill="#4FBE9B" />
      <rect x="5.2" y="15" width="9.4" height="4.2" rx="2.1" fill="#E8A63F" />
    </Svg>
  )
}

/** 태스크 보관함 · 아카이브 상자 */
export function BoxIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.6" y="3.4" width="18.8" height="4.8" rx="1.8" fill={AMBER} />
      <path
        d="M4.2 9.8h15.6v9a2.4 2.4 0 0 1-2.4 2.4H6.6a2.4 2.4 0 0 1-2.4-2.4Z"
        fill="currentColor"
        opacity={SOFT}
      />
      <rect x="9.4" y="12.4" width="5.2" height="1.9" rx=".95" fill="currentColor" />
    </Svg>
  )
}
