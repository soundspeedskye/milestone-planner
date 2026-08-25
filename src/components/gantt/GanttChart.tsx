import { Fragment, useMemo } from "react";
import { MONTHS_KO } from "../../constants/date";
import { fmt, isWeekend, pad, parseDate } from "../../lib/workdays";
import { usePlannerStore } from "../../store/usePlannerStore";
import {
  useHolidaySet,
  useRoleOffSet,
  useScheduleRange,
  useSchedules,
} from "../../store/useScheduleStore";

/** 태스크 이름 라벨. 이름만 이 셀에서 구독해, 이름 입력이 그리드 전체 리렌더로 번지지 않게 한다. */
function TaskLabel({ id, rowSpan }: { id: number; rowSpan: number }) {
  const name = usePlannerStore(
    (s) => s.ganttTasks.find((t) => t.id === id)?.name,
  );
  return (
    <td
      className="g-task-label"
      rowSpan={rowSpan}
      style={{ verticalAlign: "middle" }}
    >
      {name || "(무제)"}
    </td>
  );
}

export function GanttChart() {
  const startDate = usePlannerStore((s) => s.startDate);
  const roles = usePlannerStore((s) => s.roles);
  const schedules = useSchedules();
  const holidaySet = useHolidaySet();
  const roleOffSet = useRoleOffSet();
  const range = useScheduleRange();

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
  // (기존엔 셀마다 fmt/offClass를 다시 호출해 렌더당 수천 번씩 돌았다)
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

  if (!range || !startDate) {
    return (
      <div className="gantt-wrap">
        <div className="empty-gantt">
          간트에 태스크를 추가하면 차트가 나타납니다
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-wrap">
      <table className="gantt-table">
        <thead>
          <tr>
            <th
              className="g-task-label"
              rowSpan={2}
              style={{ verticalAlign: "middle" }}
            >
              태스크
            </th>
            <th
              className="g-role-label"
              rowSpan={2}
              style={{ verticalAlign: "middle" }}
            >
              직군
            </th>
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
                <th
                  key={i}
                  className={`date-cell ${cls}`}
                  style={{ fontSize: 11 }}
                >
                  {c.date}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => {
            const rks = roles.filter((r) => s.roles[r.id]);
            if (rks.length === 0) return null;
            return (
              <Fragment key={s.id}>
                {rks.map((r, ri) => {
                  const info = s.roles[r.id];
                  // 앵커에 끊긴 토막들. 토막 사이 칸은 비워 둔다.
                  // 셀마다 다시 훑지 않도록 경계값은 행에서 한 번만 뽑는다.
                  const segs = info.segments.map(
                    (g) => [fmt(g.start), fmt(g.end)] as const,
                  );
                  const split = segs.length > 1;
                  const first = segs[0][0];
                  const last = segs[segs.length - 1][1];
                  const roleOff = roleOffSet[r.id];
                  return (
                    <tr key={r.id}>
                      {ri === 0 && <TaskLabel id={s.id} rowSpan={rks.length} />}
                      <td
                        className="g-role-label"
                        style={{ color: r.palette.header, fontWeight: 500 }}
                      >
                        {r.name}
                        <br />
                        <span style={{ color: "#bbb", fontSize: 11 }}>
                          {info.days}일
                        </span>
                      </td>
                      {colMeta.map((c, ci) => {
                        // 막대 기간 안 주말·공휴일은 예전처럼 빗금(bar-off)을 깐다.
                        // 연차(직군 휴무)는 일정에 영향이 없어 그 날도 막대를 채우고,
                        // 위에 세로 "연차" 라벨만 얹는다.
                        const inRange = split
                          ? segs.some(([sf, ef]) => c.df >= sf && c.df <= ef)
                          : c.df >= first && c.df <= last;
                        // 토막 사이(고정일 태스크에 자리를 내준 구간)는 점선으로 잇는다
                        const inGap =
                          split && !inRange && c.df > first && c.df < last;
                        const hatched = inRange && !!c.off;
                        const filled = inRange && !c.off;
                        // 연차는 막대 기간 안에서만 표기한다 (막대 밖은 표기 안 함)
                        const isRoleOff = inRange && !c.off && !!roleOff?.has(c.df);
                        return (
                          <td
                            key={ci}
                            className={`date-cell ${c.off}${hatched ? " bar-off" : ""}${inGap ? " bar-link" : ""}`}
                            style={{
                              ...(filled ? { background: r.palette.bar } : {}),
                              ...(inGap ? { color: r.palette.bar } : {}),
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
  );
}
