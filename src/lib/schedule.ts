import type { RoleDef, Task, TaskSchedule } from "../types";
import { addWD, fmt, parseDate, type IsWorkday } from "./workdays";

/**
 * 간트 태스크들의 직군별 일정을 순차 계산한다.
 *
 * 규칙 (기본 직군 구성일 때 기존 calcSchedules와 결과 동일):
 * - 각 직군은 자기 직군의 직전 일정이 끝난 뒤(roleEnd), 그리고 같은 태스크 안에서
 *   dependsOn 직군들의 "유효 종료일" 이후에 시작한다.
 * - dependsOn 직군에 소요일이 없으면 그 직군의 dependsOn으로 거슬러 올라가고,
 *   더 올라갈 곳이 없으면 해당 직군의 roleEnd를 쓴다.
 * - fixedStart가 있으면 roleEnd 대기를 무시하고 그 날짜부터 시작하되,
 *   앞 일정과 겹치면 warnings에 기록한다. (태스크 내부 의존은 계속 지킨다)
 *
 * isWDByRole을 주면 그 직군의 소요일을 셀 때 전사 휴무일 대신 쓴다(직군별 휴무일).
 */
export function calcSchedules(
  tasks: Task[],
  roles: RoleDef[],
  projectStart: Date,
  isWD: IsWorkday,
  isWDByRole: Record<string, IsWorkday> = {},
): TaskSchedule[] {
  const roleEnd: Record<string, Date> = {};
  roles.forEach((r) => {
    roleEnd[r.id] = new Date(projectStart);
  });
  const roleById = new Map(roles.map((r) => [r.id, r]));

  return tasks.map((task) => {
    const s: TaskSchedule = {
      id: task.id,
      name: task.name || "(무제)",
      roles: {},
      warnings: [],
    };
    const fixedStart = task.fixedStart ? parseDate(task.fixedStart) : null;

    const effEnd = new Map<string, Date>();
    const computing = new Set<string>();

    const effectiveEnd = (roleId: string): Date => {
      const cached = effEnd.get(roleId);
      if (cached) return cached;
      const role = roleById.get(roleId);
      if (!role || computing.has(roleId))
        return roleEnd[roleId] ?? new Date(projectStart);
      computing.add(roleId);

      const days = task.days[roleId] || 0;
      let result: Date;
      if (days > 0) {
        const depEnds = role.dependsOn.map(effectiveEnd);
        const depMax = depEnds.length
          ? Math.max(...depEnds.map((d) => d.getTime()))
          : 0;
        let startT = Math.max(roleEnd[roleId].getTime(), depMax);
        if (fixedStart) {
          const fixedT = Math.max(fixedStart.getTime(), depMax);
          if (fixedT < roleEnd[roleId].getTime()) {
            s.warnings.push(
              `${role.name}: \n 시작일이 앞 일정(${fmt(roleEnd[roleId])} 종료)과 겹쳐요`,
            );
          }
          startT = fixedT;
        }
        const start = new Date(startT);
        const end = addWD(start, days, isWDByRole[roleId] ?? isWD);
        s.roles[roleId] = { start, end, days };
        if (end > roleEnd[roleId]) roleEnd[roleId] = new Date(end);
        result = end;
      } else if (role.dependsOn.length > 0) {
        const depEnds = role.dependsOn.map(effectiveEnd);
        result = new Date(Math.max(...depEnds.map((d) => d.getTime())));
      } else {
        result = new Date(roleEnd[roleId]);
      }
      computing.delete(roleId);
      effEnd.set(roleId, result);
      return result;
    };

    roles.forEach((r) => effectiveEnd(r.id));
    return s;
  });
}

/** 모든 일정의 최소 시작일/최대 종료일 */
export function scheduleRange(
  schedules: TaskSchedule[],
): { min: Date; max: Date } | null {
  const starts: number[] = [];
  const ends: number[] = [];
  schedules.forEach((s) =>
    Object.values(s.roles).forEach((r) => {
      starts.push(r.start.getTime());
      ends.push(r.end.getTime());
    }),
  );
  if (!ends.length) return null;
  return {
    min: new Date(Math.min(...starts)),
    max: new Date(Math.max(...ends)),
  };
}
