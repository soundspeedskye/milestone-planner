import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MONTHS_KO } from "../../constants/date";
import { fmt, isWeekend, pad, parseDate } from "../../lib/workdays";
import { usePlannerStore } from "../../store/usePlannerStore";
import { useDragStore } from "../../store/useDragStore";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import {
  useHolidaySet,
  useRoleOffSet,
  useScheduleRange,
  useSchedules,
} from "../../store/useScheduleStore";
import { PinIcon } from "../icons/AppIcons";
import { GanttTaskCell } from "./GanttTaskCell";
import { DropZone } from "./DropZone";

function formatWorkDate(start: Date, end: Date) {
  const toMmDd = (date: Date) => `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
  const first = toMmDd(start)
  const last = toMmDd(end)
  return first === last ? first : `${first}–${last}`
}

export function GanttChart() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasCenteredToday = useRef(false);
  const startDate = usePlannerStore((s) => s.startDate);
  const roles = usePlannerStore((s) => s.roles);
  const readonly = useWorkspaceStore((s) => s.readonly);
  const schedules = useSchedules();
  const holidaySet = useHolidaySet();
  const roleOffSet = useRoleOffSet();
  const range = useScheduleRange();

  // 태스크 셀 드래그 재정렬 (예전 간트 태스크 목록이 하던 일)
  const ganttIndex = useDragStore((s) => s.ganttIndex);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const handleOver = useCallback((i: number | null) => setOverIndex(i), []);

  const cols = useMemo(() => {
    if (!range || !startDate) return [];
    const maxDate = new Date(range.max);
    maxDate.setDate(maxDate.getDate() + 4);
    const list: Date[] = [];
    // 차트는 항상 프로젝트 시작일부터 그린다. 고정 시작일 때문에 첫 일정이
    // 시작일보다 앞설 수도 있어서 둘 중 이른 날을 첫 칸으로 쓴다.
    const cur = new Date(
      Math.min(parseDate(startDate).getTime(), range.min.getTime()),
    );
    while (cur <= maxDate) {
      list.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [range?.min.getTime(), range?.max.getTime(), startDate]);

  // 오늘(자정 기준) 문자열. 매 렌더 계산해도 fmt 한 번이라 값이 그대로면
  // 아래 colMeta 메모가 재계산되지 않는다(자정을 넘기면 자연히 갱신).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayFmt = fmt(today);

  // 컬럼별 날짜 문자열·쉬는 날 판정·오늘 여부를 한 번만 계산한다.
  const colMeta = useMemo(
    () =>
      cols.map((d) => {
        const df = fmt(d);
        return {
          df,
          date: pad(d.getDate()),
          off: holidaySet.has(df) ? "holiday" : isWeekend(d) ? "weekend" : "",
          isToday: df === todayFmt,
        };
      }),
    [cols, holidaySet, todayFmt],
  );

  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    let prevMo: string | null = null;
    cols.forEach((d) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== prevMo) {
        groups.push({
          label: `${d.getFullYear()}년 ${MONTHS_KO[d.getMonth()]}`,
          count: 1,
        });
        prevMo = key;
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [cols]);

  // 프로젝트 진입 직후에는 오늘 열을 차트의 정중앙으로 맞춘다. 이후 사용자가
  // 움직인 스크롤 위치는 건드리지 않으며, 오늘이 표시 범위 밖이면 기존 시작 위치를 쓴다.
  useLayoutEffect(() => {
    if (hasCenteredToday.current || !range) return;
    const wrap = wrapRef.current;
    const todayCell = wrap?.querySelector<HTMLElement>(`[data-gantt-date="${todayFmt}"]`);
    hasCenteredToday.current = true;
    if (!wrap || !todayCell) return;

    const targetLeft = todayCell.offsetLeft - (wrap.clientWidth - todayCell.offsetWidth) / 2;
    wrap.scrollLeft = Math.max(0, targetLeft);
  }, [range, todayFmt]);

  // 간트가 비어 있어도 카드와 드롭 줄은 남는다. 이게 없으면 태스크를 추가할 길이 사라진다.
  if (schedules.length === 0) {
    return (
      <div className="gantt-card">
        <div className="gantt-wrap">
          <div className="empty-gantt">
            {readonly
              ? "이 프로젝트에는 아직 일정이 없어요"
              : "왼쪽 보관함에서 태스크를 끌어다 놓으면 차트가 나타나요"}
          </div>
        </div>
        {!readonly && <DropZone />}
      </div>
    );
  }

  return (
    <div className="gantt-card">
      <div className="gantt-wrap" ref={wrapRef}>
        <table className="gantt-table">
          <thead>
            <tr>
              <th className="g-task-label" rowSpan={2} style={{ verticalAlign: "middle" }}>태스크</th>
              <th className="g-role-label" rowSpan={2} style={{ verticalAlign: "middle" }}>직군</th>
              <th className="g-work-date" rowSpan={2} style={{ verticalAlign: "middle" }}>작업일</th>
              {monthGroups.map((mg, i) => (
                <th key={i} colSpan={mg.count} className="month-header">
                  {mg.label}
                </th>
              ))}
            </tr>
            <tr>
              {colMeta.map((c, i) => {
                const cls = c.isToday ? "today-header" : c.off;
                return (
                  <th key={i} className={`date-cell ${cls}`} data-gantt-date={c.df}>
                    {c.date}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s, taskIndex) => {
              const rks = roles.filter((r) => s.roles[r.id]);

              // 직군별 일수가 하나도 없는 태스크. 차트에 막대는 없지만 줄은 남겨
              // 수정·꺼내기·시작일 고정에 계속 닿을 수 있게 한다.
              if (rks.length === 0) {
                return (
                  <tr key={s.id} className="task-end">
                    <GanttTaskCell
                      id={s.id}
                      index={taskIndex}
                      rowSpan={1}
                      roles={roles}
                      readonly={readonly}
                      dragging={ganttIndex === taskIndex}
                      over={overIndex === taskIndex}
                      onOver={handleOver}
                    />
                    <td className="g-role-label" style={{ color: "#ababa3" }}>—</td>
                    <td className="g-work-date" style={{ color: "#ababa3" }}>일수 없음</td>
                    {colMeta.map((c, ci) => (
                      <td
                        key={ci}
                        className={`date-cell ${c.off}`}
                        style={c.isToday ? { borderLeft: "2px solid #E24B4A" } : undefined}
                      />
                    ))}
                  </tr>
                );
              }

              return (
                <Fragment key={s.id}>
                  {rks.map((r, ri) => {
                    const info = s.roles[r.id];
                    // 셀마다 다시 훑지 않도록 경계값은 행에서 한 번만 뽑는다.
                    const first = fmt(info.start);
                    const last = fmt(info.end);
                    const roleOff = roleOffSet[r.id];
                    // 한 태스크의 마지막 직군 줄에만 진한 구분선을 준다.
                    const isTaskEnd = ri === rks.length - 1;
                    return (
                      <tr key={r.id} className={isTaskEnd ? "task-end" : ""}>
                        {ri === 0 && (
                          <GanttTaskCell
                            id={s.id}
                            index={taskIndex}
                            rowSpan={rks.length}
                            roles={roles}
                            readonly={readonly}
                            dragging={ganttIndex === taskIndex}
                            over={overIndex === taskIndex}
                            onOver={handleOver}
                          />
                        )}
                        <td
                          className="g-role-label"
                          style={{ color: r.palette.header, fontWeight: 600 }}
                        >
                          {r.name}
                          {info.pinned && (
                            <span
                              className="g-role-pin tip tip-right"
                              data-tooltip={`시작일 고정 ${first}`}
                              role="img"
                              aria-label={`시작일 고정 ${first}`}
                            >
                              <PinIcon size={11} />
                            </span>
                          )}
                          <br />
                          <span className="g-role-days">{info.days}일</span>
                        </td>
                        <td
                          className="g-work-date"
                          aria-label={`${fmt(info.start)}부터 ${fmt(info.end)}까지`}
                        >
                          {formatWorkDate(info.start, info.end)}
                        </td>
                        {colMeta.map((c, ci) => {
                          // 막대 기간 안 주말·공휴일은 예전처럼 빗금(bar-off)을 깐다.
                          // 연차(직군 휴무)는 일정에 영향이 없어 그 날도 막대를 채우고,
                          // 위에 세로 "연차" 라벨만 얹는다.
                          const inRange = c.df >= first && c.df <= last;
                          const hatched = inRange && !!c.off;
                          const filled = inRange && !c.off;
                          // 연차는 막대 기간 안에서만 표기한다 (막대 밖은 표기 안 함)
                          const isRoleOff = inRange && !c.off && !!roleOff?.has(c.df);
                          return (
                            <td
                              key={ci}
                              className={`date-cell ${c.off}${hatched ? " bar-off" : ""}`}
                              style={{
                                ...(filled ? { background: r.palette.bar } : {}),
                                ...(c.isToday
                                  ? { borderLeft: "2px solid #E24B4A" }
                                  : {}),
                              }}
                            >
                              {isRoleOff && (
                                <span
                                  className="role-off-label"
                                  style={{ color: r.palette.barText }}
                                >
                                  연차
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readonly && <DropZone />}
    </div>
  );
}
