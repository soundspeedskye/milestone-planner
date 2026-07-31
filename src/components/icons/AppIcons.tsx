/**
 * 앱 전역 일러스트 아이콘 (후보 E · 파스텔 멀티).
 * 그림책 화법: 외곽선 없는 부드러운 채색 + 밝은 하이라이트 덩어리 + 잎 점 텍스처.
 * viewBox 0 0 44 44 기준으로 그리고 size 로 스케일한다.
 */
import type { ReactNode } from 'react'

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
      viewBox="0 0 44 44"
      className={className}
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

/** 설정 · 민트 톱니 */
export function GearIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <g fill="#5DCAA5">
        <circle cx="22" cy="10" r="6" /><circle cx="34" cy="22" r="6" />
        <circle cx="22" cy="34" r="6" /><circle cx="10" cy="22" r="6" />
        <circle cx="30.5" cy="13.5" r="5.5" /><circle cx="30.5" cy="30.5" r="5.5" />
        <circle cx="13.5" cy="30.5" r="5.5" /><circle cx="13.5" cy="13.5" r="5.5" />
        <circle cx="22" cy="22" r="12" />
      </g>
      <path d="M14 15 a11 11 0 0 1 9 -5" fill="none" stroke="#9FE1CB" strokeWidth="4" strokeLinecap="round" />
      <circle cx="22" cy="22" r="4.5" fill="#E1F5EE" />
      <circle cx="17" cy="12" r="1.1" fill="#0F6E56" /><circle cx="32" cy="18" r="1.1" fill="#0F6E56" />
    </Svg>
  )
}

/** 버전 · 하늘색 시계 */
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <g fill="#85B7EB">
        <circle cx="15" cy="17" r="8" /><circle cx="29" cy="16" r="8" />
        <circle cx="17" cy="29" r="8" /><circle cx="28" cy="29" r="8" /><circle cx="22" cy="22" r="11" />
      </g>
      <circle cx="17" cy="17" r="6" fill="#B5D4F4" />
      <path d="M22 22 V14 M22 22 L28 25" stroke="#185FA5" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="22" r="1.8" fill="#185FA5" />
    </Svg>
  )
}

/** 저장 · 살구색 디스크 */
export function DiskIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 13 q0 -4 4 -4 h16 q3 3 6 6 v18 q0 4 -4 4 H13 q-4 0 -4 -4 Z" fill="#EF9F27" />
      <path d="M15 9 h13 v7 q0 2 -2 2 H17 q-2 0 -2 -2 Z" fill="#FAC775" />
      <rect x="14" y="24" width="16" height="9" rx="3" fill="#FAEEDA" />
      <circle cx="13" cy="21" r="1.2" fill="#854F0B" /><circle cx="31" cy="30" r="1.2" fill="#854F0B" />
    </Svg>
  )
}

/** 수정 · 핑크 연필 */
export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <g transform="rotate(45 22 22)">
        <path d="M17 9 q5 -2 10 0 v18 q-5 2 -10 0 Z" fill="#ED93B1" />
        <path d="M17 9 q5 -2 10 0 v5 q-5 2 -10 0 Z" fill="#F4C0D1" />
        <path d="M17 27 q5 2 10 0 l-5 8 Z" fill="#993556" />
      </g>
      <circle cx="14" cy="16" r="1.2" fill="#993556" /><circle cx="31" cy="24" r="1.2" fill="#993556" />
    </Svg>
  )
}

/** 보기 · 보라 눈 */
export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 22 Q22 8 39 22 Q22 36 5 22 Z" fill="#7F77DD" />
      <path d="M9 20 Q22 11 35 20 Q22 16 9 20 Z" fill="#AFA9EC" />
      <circle cx="22" cy="22" r="6.5" fill="#3C3489" /><circle cx="22" cy="22" r="2.6" fill="#EEEDFE" />
    </Svg>
  )
}

/** 잠금 · 코랄 자물쇠 */
export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 21 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#993C1D" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M11 22 q0 -3 3 -3 h16 q3 0 3 3 v10 q0 3 -3 3 H14 q-3 0 -3 -3 Z" fill="#F0997B" />
      <path d="M11 22 q0 -3 3 -3 h16 q3 0 3 3 v3 H11 Z" fill="#F5C4B3" />
      <circle cx="22" cy="26.5" r="2.4" fill="#7A2E14" /><rect x="21" y="27" width="2" height="4.5" rx="1" fill="#7A2E14" />
    </Svg>
  )
}

/** 캘린더 · 하늘색 달력 */
export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 14 q0 -3 3 -3 h22 q3 0 3 3 v20 q0 3 -3 3 H11 q-3 0 -3 -3 Z" fill="#85B7EB" />
      <path d="M8 14 q0 -3 3 -3 h22 q3 0 3 3 v5 H8 Z" fill="#185FA5" />
      <rect x="13" y="7" width="3.4" height="8" rx="1.7" fill="#185FA5" /><rect x="27.6" y="7" width="3.4" height="8" rx="1.7" fill="#185FA5" />
      <g fill="#E6F1FB"><circle cx="16" cy="26" r="2" /><circle cx="22" cy="26" r="2" /><circle cx="28" cy="26" r="2" /><circle cx="16" cy="32" r="2" /><circle cx="22" cy="32" r="2" /></g>
    </Svg>
  )
}

/** 경고 · 살구색 삼각형 */
export function WarningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M22 7 q2.4 0 3.6 2.2 L37 30 q1.2 2.4 -0.4 4 Q35.2 35 33 35 H11 q-2.2 0 -3.6 -1 Q6 32.4 7 30 L18.4 9.2 Q19.6 7 22 7 Z" fill="#EF9F27" />
      <path d="M22 9.5 L33 30 H11 Z" fill="#FAC775" />
      <rect x="20.3" y="17" width="3.4" height="9" rx="1.7" fill="#854F0B" /><circle cx="22" cy="30" r="1.9" fill="#854F0B" />
    </Svg>
  )
}

/** 시작일 고정 · 빨강 핀 */
export function PinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M22 5 q10 0 10 9 q0 8 -10 24 q-10 -16 -10 -24 q0 -9 10 -9 Z" fill="#E24B4A" />
      <path d="M22 5 q10 0 10 9 q0 3 -2 8 q-8 -2 -14 -7 q1.5 -10 6 -10 Z" fill="#F09595" />
      <circle cx="22" cy="14" r="3.8" fill="#FCEBEB" />
    </Svg>
  )
}

/** 꺼내기 · 되돌림 화살표 (초록) */
export function EjectIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 13 L9 21 L18 29 v-5 q10 -1 13 7 q2 -13 -13 -14 Z" fill="#639922" />
      <path d="M18 13 L9 21 L18 29 v-5 q10 -1 13 7 q2 -13 -13 -14 Z" fill="none" stroke="#3B6D11" strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  )
}

/** 복원 · 되감기 원형 화살표 (파랑) */
export function RestoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M22 11 a11 11 0 1 1 -10.5 14" fill="none" stroke="#378add" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M22 6 l1 9 l-8 -3 Z" fill="#185FA5" />
    </Svg>
  )
}
