import type { RoleDef, RoleSchedule, Task, TaskSchedule } from "../types";
import { addWD, parseDate, type IsWorkday } from "./workdays";

/** 안전장치. 정상 설정에서는 이 근처도 못 가고 끝난다 (점유 구간은 통째로 건너뛴다) */
const MAX_SCAN_DAYS = 20000;

/** 한 직군이 잡아 둔 구간. 모양이 RoleSchedule과 같아 그대로 쓴다 */
type Busy = RoleSchedule;

/**
 * 간트 태스크들의 직군별 일정을 계산한다.
 *
 * 기본은 간트 목록 순서대로 이어 붙이는 것이고, 시작일을 고정한 태스크(앵커)만
 * 예외로 자기 날짜를 먼저 선점한다.
 * 1) 앵커의 "시작 직군"이 목록 순서대로 고정일부터 자리를 잡고 그 날짜를 예약한다.
 * 2) 목록 순서대로 훑으며 나머지를 배치한다.
 *    희망 시작일 = 그 직군의 진행 커서(roleEnd) 다음 영업일.
 *
 * 고정일은 "이 태스크가 그 날 시작한다"는 뜻이므로 **시작 직군에만** 적용한다.
 * 시작 직군 = 그 태스크 안에서 자기보다 먼저 일하는 직군이 없는 직군. dependsOn을
 * 거슬러 올라가 소요일이 있는 직군이 하나도 없으면 시작 직군이다(기획이 0일인
 * 태스크에서는 BE나 QA가 시작 직군이 된다). 뒤따르는 직군들은 고정일과 무관하게
 * 평소 규칙(커서·의존)을 따르므로, 앵커가 목록 중간에서 남의 자리를 뺏지 않는다.
 *
 * 막대는 쪼개지지 않는다. 희망 시작일부터 훑다가 그 직군이 이미 쓰는 날을 만나면
 * 지금까지 모은 구간을 버리고 그 구간 끝 다음 날부터 다시 센다. 즉 소요일만큼
 * 연속으로 비어 있는 첫 자리를 잡는다(주말·공휴일은 막대 안에 품고 간다).
 *
 * 태스크 내부 의존은 어느 경우에도 지킨다.
 * - 각 직군은 같은 태스크 안에서 dependsOn 직군들의 종료일 다음 영업일부터 시작한다.
 * - dependsOn 직군에 소요일이 없으면 그 직군의 dependsOn으로 거슬러 올라가고,
 *   더 올라갈 곳이 없으면 그 직군의 진행 커서를 쓴다.
 *
 * 직군별 휴무일(연차)은 일정 계산에 영향을 주지 않는다. 전사 휴무일(isWD)만으로
 * 모든 직군의 소요일을 세므로, 연차를 추가·삭제해도 시작·종료일이 바뀌지 않는다.
 * 연차는 표기 전용이다(GanttChart의 세로 "연차" 라벨).
 */
export function calcSchedules(
  tasks: Task[],
  roles: RoleDef[],
  projectStart: Date,
  isWD: IsWorkday,
): TaskSchedule[] {
  // floor는 "아직 아무 일도 없었던 시점"을 뜻한다. 프로젝트 시작 전날로 두면
  // 그 다음 영업일이 projectStart 당일이 된다.
  const floor = new Date(projectStart);
  floor.setDate(floor.getDate() - 1);
  const roleById = new Map(roles.map((r) => [r.id, r]));

  // 직군별로 이미 잡힌 구간들. 여기 걸리는 날은 다른 태스크가 쓸 수 없다.
  const busy: Record<string, Busy[]> = {};
  // 직군별 진행 커서 = 목록 순서로 여기까지 왔다는 표시(그 직군이 마지막으로 일한 날).
  // 0일 직군이 하위 직군의 대기 기준으로 쓰일 때의 폴백이기도 하다.
  const roleEnd: Record<string, Date> = {};
  roles.forEach((r) => {
    busy[r.id] = [];
    roleEnd[r.id] = new Date(floor);
  });

  /**
   * d를 덮고 있는 점유 구간 (없으면 null).
   * busy는 시작일 순으로 정렬돼 있고 서로 겹치지 않으므로 이진 탐색이 가능하다.
   */
  const covering = (roleId: string, d: Date): Busy | null => {
    const list = busy[roleId];
    let lo = 0;
    let hi = list.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].end < d) lo = mid + 1;
      else if (list[mid].start > d) hi = mid - 1;
      else return list[mid];
    }
    return null;
  };

  /** 점유 등록. covering의 이진 탐색 전제(시작일 순 정렬)를 지킨다. */
  const occupy = (roleId: string, seg: Busy) => {
    const list = busy[roleId];
    let i = list.length;
    while (i > 0 && list[i - 1].start > seg.start) i--;
    list.splice(i, 0, seg);
  };

  /**
   * 희망 시작일 이후로 남이 안 쓰는 영업일이 days개 연속되는 첫 자리를 잡는다.
   * 주말·공휴일은 막대 안에 품고 가지만, 남이 쓰는 날을 만나면 지금까지 모은 구간을
   * 버리고 그 구간 끝 다음 날부터 다시 센다 (막대는 쪼개지지 않는다).
   */
  const take = (roleId: string, earliest: Date, days: number): Busy => {
    const d = new Date(earliest);
    let start: Date | null = null;
    let end: Date | null = null;
    let taken = 0;
    for (let i = 0; i < MAX_SCAN_DAYS; i++) {
      const blocking = covering(roleId, d);
      if (blocking) {
        start = null;
        end = null;
        taken = 0;
        // 남의 구간은 하루씩 훑지 않고 끝으로 건너뛴다 (아래 +1일로 그 다음 날이 된다)
        d.setTime(blocking.end.getTime());
      } else if (isWD(d)) {
        if (!start) start = new Date(d);
        end = new Date(d);
        if (++taken === days) return { start, end, days };
      }
      d.setDate(d.getDate() + 1);
    }
    // 여기까지 오면 설정이 비정상이다. 최소한 시작일은 돌려준다.
    return { start: new Date(earliest), end: new Date(earliest), days };
  };

  const byId = new Map<number, TaskSchedule>();
  const result: TaskSchedule[] = tasks.map((t) => {
    const s: TaskSchedule = { id: t.id, roles: {} };
    byId.set(t.id, s);
    return s;
  });

  /**
   * 이 태스크 안에서 자기보다 먼저 일하는 직군이 없는 직군 = 태스크의 시작 직군.
   * 고정일은 이 직군에만 적용된다.
   */
  const isStartRole = (task: Task, roleId: string): boolean => {
    const seen = new Set<string>();
    const worksAbove = (id: string): boolean => {
      const role = roleById.get(id);
      if (!role || seen.has(id)) return false;
      seen.add(id);
      return role.dependsOn.some(
        (dep) => (task.days[dep] || 0) > 0 || worksAbove(dep),
      );
    };
    return !worksAbove(roleId);
  };

  /**
   * 한 태스크의 직군 일정을 잡는다.
   * anchored=true면 시작 직군만 고정일부터 자리를 찾는다(예약 단계). 커서는 안 건드린다.
   * false면 그 직군의 진행 커서 다음 영업일부터 찾고, 끝나면 커서를 전진시킨다.
   * 예약 단계에서 이미 잡힌 직군은 그대로 두고 커서만 전진시킨다.
   */
  const place = (task: Task, anchored: boolean) => {
    const s = byId.get(task.id)!;
    const fixedStart = task.fixedStart ? parseDate(task.fixedStart) : null;

    const effEnd = new Map<string, Date>();
    const computing = new Set<string>();

    const effectiveEnd = (roleId: string): Date => {
      const cached = effEnd.get(roleId);
      if (cached) return cached;
      const role = roleById.get(roleId);
      if (!role || computing.has(roleId))
        return roleEnd[roleId] ?? new Date(floor);
      computing.add(roleId);

      // 예약 단계에서 이미 자리를 잡은 직군은 그 결과를 그대로 쓴다
      const placed = s.roles[roleId];
      if (placed) {
        if (!anchored && placed.end > roleEnd[roleId])
          roleEnd[roleId] = new Date(placed.end);
        computing.delete(roleId);
        effEnd.set(roleId, placed.end);
        return placed.end;
      }

      const days = task.days[roleId] || 0;
      let result: Date;
      if (days > 0) {
        const depEnds = role.dependsOn.map(effectiveEnd);
        const depMax = depEnds.length
          ? Math.max(...depEnds.map((d) => d.getTime()))
          : 0;
        // 예약 단계(시작 직군)는 고정일부터, 나머지는 그 직군이 진행한 다음 영업일부터.
        let earliest =
          anchored && fixedStart
            ? new Date(fixedStart)
            : addWD(roleEnd[roleId], 1, isWD);
        if (depMax) {
          const depFirst = addWD(new Date(depMax), 1, isWD);
          if (depFirst > earliest) earliest = depFirst;
        }
        const slot = take(roleId, earliest, days);
        const end = new Date(slot.end);
        s.roles[roleId] = { start: new Date(slot.start), end, days };
        occupy(roleId, slot);
        // 앵커의 커서 전진은 목록에서 자기 차례가 왔을 때 한다 (아래 2단계)
        if (!anchored && end > roleEnd[roleId]) roleEnd[roleId] = new Date(end);
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

    roles.forEach((r) => {
      // 예약 단계에서는 고정일이 적용되는 시작 직군만 자리를 잡는다
      if (anchored && !isStartRole(task, r.id)) return;
      effectiveEnd(r.id);
    });
  };

  // 1) 앵커의 시작 직군이 자기 날짜를 선점한다 (목록 순서).
  tasks.forEach((t) => {
    if (t.fixedStart) place(t, true);
  });
  // 2) 목록 순서대로 나머지를 배치한다. 선점한 자리는 커서에 반영만 하고 지나간다.
  tasks.forEach((t) => place(t, false));

  return result;
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
