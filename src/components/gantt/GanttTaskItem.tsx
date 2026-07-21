import { memo } from "react";
import { usePlannerStore } from "../../store/usePlannerStore";
import { useDragStore } from "../../store/useDragStore";
import type { RoleDef, Task } from "../../types";

interface Props {
  task: Task;
  index: number;
  roles: RoleDef[];
  warnings: string[];
  dragging: boolean;
  over: boolean;
  onOver: (i: number | null) => void;
}

/**
 * 간트 목록의 한 줄.
 * 드래그 중에는 목록 전체가 아니라 상태가 바뀐 줄만 다시 그리도록 memo로 감싼다.
 * 스토어 액션은 참조가 고정이라 memo 비교를 깨지 않는다.
 */
export const GanttTaskItem = memo(function GanttTaskItem({
  task,
  index,
  roles,
  warnings,
  dragging,
  over,
  onOver,
}: Props) {
  const ejectFromGantt = usePlannerStore((s) => s.ejectFromGantt);
  const reorderGantt = usePlannerStore((s) => s.reorderGantt);
  const setFixedStart = usePlannerStore((s) => s.setFixedStart);
  const setGanttIndex = useDragStore((s) => s.setGanttIndex);

  return (
    <div
      className={`gantt-task-item ${dragging ? "dragging" : ""} ${over ? "drag-over" : ""}`}
      draggable
      onDragStart={(e) => {
        setGanttIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("source", "gantt");
      }}
      onDragEnd={() => setGanttIndex(null)}
      onDragOver={(e) => {
        e.preventDefault();
        onOver(index);
      }}
      onDragLeave={() => onOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        onOver(null);
        const { ganttIndex: from } = useDragStore.getState();
        if (
          e.dataTransfer.getData("source") === "gantt" &&
          from !== null &&
          from !== index
        ) {
          reorderGantt(from, index);
          setGanttIndex(null);
        }
      }}
    >
      <span className="drag-handle-gantt">⠿</span>
      <span className="gantt-task-label">{task.name || "(무제)"}</span>
      {warnings.length > 0 && (
        <span
          className="warn-icon tip"
          data-tooltip={warnings.join("\n")}
          tabIndex={0}
          role="img"
          aria-label={`경고: ${warnings.join(", ")}`}
        >
          ⚠️
        </span>
      )}
      <span className="fixed-start">
        <span
          className="tip pin-icon"
          data-tooltip="시작일 고정"
          tabIndex={0}
          role="img"
          aria-label="시작일 고정: 지정하면 순차 계산 대신 이 날짜부터 시작해요"
        >
          📌
        </span>
        <input
          type="date"
          className={task.fixedStart ? "pinned" : ""}
          value={task.fixedStart ?? ""}
          onChange={(e) => setFixedStart(task.id, e.target.value || undefined)}
        />
        {task.fixedStart && (
          <button
            className="btn-unpin tip"
            data-tooltip="고정 해제"
            aria-label="시작일 고정 해제"
            onClick={() => setFixedStart(task.id, undefined)}
          >
            ✕
          </button>
        )}
      </span>
      <div className="gantt-task-days">
        {roles
          .filter((r) => (task.days[r.id] || 0) > 0)
          .map((r) => (
            <span
              key={r.id}
              className="day-badge"
              style={{
                background: r.palette.badgeBg,
                color: r.palette.badgeText,
              }}
            >
              {r.name} {task.days[r.id]}일
            </span>
          ))}
      </div>
      <button
        className="btn-eject tip tip-right"
        onClick={() => ejectFromGantt(task.id)}
        data-tooltip="보관함으로 꺼내기"
        aria-label="보관함으로 꺼내기"
      >
        ↩
      </button>
    </div>
  );
});
