import { create } from 'zustand'

/** HTML5 DnD 진행 상태 (저장 안 함) */
interface DragState {
  poolId: number | null
  ganttIndex: number | null
  setPoolId: (id: number | null) => void
  setGanttIndex: (i: number | null) => void
}

export const useDragStore = create<DragState>(set => ({
  poolId: null,
  ganttIndex: null,
  setPoolId: id => set({ poolId: id }),
  setGanttIndex: i => set({ ganttIndex: i }),
}))
