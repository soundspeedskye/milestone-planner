import { useAuthStore } from '../../store/useAuthStore'
import { usePlannerStore } from '../../store/usePlannerStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { BoxIcon, ChartIcon, ClockIcon, GearIcon, GridIcon } from '../icons/AppIcons'

interface Props {
  /** 보관함이 펼쳐져 있는지 (접힘 아이콘의 aria-expanded 에 쓴다) */
  poolOpen: boolean
  onTogglePool: () => void
  onOpenSettings: () => void
  onOpenVersions: () => void
}

/** 이메일 첫 글자(한글이면 그대로, 영문이면 대문자)로 만드는 아바타 글자 */
function initial(email: string | undefined) {
  const ch = email?.trim()[0]
  return ch ? ch.toUpperCase() : '·'
}

/**
 * 왼쪽 아이콘 레일. 예전 상단바가 갖고 있던 전역 이동(목록)과
 * 버전·설정을 여기로 모으고, 본문 상단은 프로젝트 자체에 내준다.
 */
export function AppRail({ poolOpen, onTogglePool, onOpenSettings, onOpenVersions }: Props) {
  const readonly = useWorkspaceStore(s => s.readonly)
  const preview = useWorkspaceStore(s => s.preview)
  const email = useAuthStore(s => s.user?.email)
  const poolCount = usePlannerStore(s => s.poolTasks.length)

  return (
    <nav className="rail" aria-label="주요 메뉴">
      <span className="rail-logo" aria-hidden="true">
        <ChartIcon size={20} />
      </span>

      <button
        className="rail-btn tip tip-right"
        onClick={() => window.history.back()}
        data-tooltip="프로젝트 목록"
        aria-label="프로젝트 목록"
      >
        <GridIcon size={21} />
      </button>

      <button className="rail-btn active tip tip-right" data-tooltip="간트" aria-label="간트" aria-current="page">
        <ChartIcon size={21} />
      </button>

      {!readonly && (
        <button
          className="rail-btn tip tip-right"
          onClick={onTogglePool}
          aria-expanded={poolOpen}
          aria-controls="task-pool"
          data-tooltip={poolOpen ? '태스크 보관함 접기' : '태스크 보관함 펼치기'}
          aria-label={poolOpen ? '태스크 보관함 접기' : '태스크 보관함 펼치기'}
        >
          <BoxIcon size={21} />
          {poolCount > 0 && <span className="rail-badge" aria-hidden="true">{poolCount}</span>}
        </button>
      )}

      {!preview && (
        <button className="rail-btn tip tip-right" onClick={onOpenVersions} data-tooltip="버전" aria-label="버전">
          <ClockIcon size={21} />
        </button>
      )}

      {!readonly && (
        <button className="rail-btn tip tip-right" onClick={onOpenSettings} data-tooltip="설정" aria-label="설정">
          <GearIcon size={21} />
        </button>
      )}

      <span className="rail-spacer" />
      <span className="rail-avatar" title={email ?? undefined}>{initial(email)}</span>
    </nav>
  )
}
