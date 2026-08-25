import type { RoleDef, RoleSegment, Task, TaskSchedule } from "../types";
import { addWD, parseDate, type IsWorkday } from "./workdays";

/** 안전장치. 정상 설정에서는 이 근처도 못 가고 끝난다 (점유 구간은 통째로 건너뛴다) */
const MAX_SCAN_DAYS = 20000;

/**
 * 간트 태스크들의 직군별 일정을 계산한다.
 *
 * 기본은 간트 목록 순서대로 이어 붙이는 것이고, 시작일을 고정한 태스크(앵커)만
 * 예외로 자기 날짜를 먼저 선점한다.
 * 1) 앵커를 목록 순서대로 배치해 그 날짜를 예약한다. 희망 시작일 = 고정일.
 * 2) 목록 순서대로 훑으며 나머지 태스크를 배치한다.
 *    희망 시작일 = 그 직군의 진행 커서(roleEnd) 다음 영업일.
 *    앵커도 목록에서 자기 차례가 되면 커서를 자기 종료일까지 전진시킨다.
 *    → 목록에서 앵커보다 뒤에 있는 태스크는 앵커 뒤에서 시작한다.
 *
 * 희망 시작일부터 하루씩 훑으며 "그 직군이 아직 안 쓴 영업일"을 소요일만큼 채운다.
 * 예약된 날이 중간에 끼면 그 날은 건너뛰고 남은 소요일을 이어서 채우므로, 목록에서
 * 앵커보다 앞선 태스크는 막대가 여러 토막(segments)으로 쪼개질 수 있다. 총 소요일은
 * 보존된다. 희망 시작일 자체가 예약돼 있으면 첫 빈 영업일까지 통째로 밀린다.
 *
 * 태스크 내부 의존은 어느 경우에도 지킨다.
 * - 각 직군은 같은 태스크 안에서 dependsOn 직군들의 "유효 종료일"(마지막 토막 종료일)
 *   다음 영업일부터 시작한다.
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
  const busy: Record<string, RoleSegment[]> = {};
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
  const covering = (roleId: string, d: Date): RoleSegment | null => {
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
  const occupy = (roleId: string, seg: RoleSegment) => {
    const list = busy[roleId];
    let i = list.length;
    while (i > 0 && list[i - 1].start > seg.start) i--;
    list.splice(i, 0, seg);
  };

  /** 희망 시작일부터 빈 영업일을 days개 먹는다. 점유된 날에서만 토막이 끊긴다. */
  const take = (roleId: string, earliest: Date, days: number): RoleSegment[] => {
    const segs: RoleSegment[] = [];
    let cur: RoleSegment | null = null;
    const d = new Date(earliest);
    let taken = 0;
    for (let i = 0; taken < days && i < MAX_SCAN_DAYS; i++) {
      const blocking = covering(roleId, d);
      if (blocking) {
        // 주말·공휴일은 막대 안에 품고 가지만, 남이 쓰는 날에서는 토막을 끊는다.
        cur = null;
        // 남의 구간은 하루씩 훑지 않고 끝으로 건너뛴다 (아래 +1일로 그 다음 날이 된다)
        d.setTime(blocking.end.getTime());
      } else if (isWD(d)) {
        if (cur) {
          cur.end = new Date(d);
          cur.days++;
        } else {
          cur = { start: new Date(d), end: new Date(d), days: 1 };
          segs.push(cur);
        }
        taken++;
      }
      d.setDate(d.getDate() + 1);
    }
    return segs;
  };

  const byId = new Map<number, TaskSchedule>();
  const result: TaskSchedule[] = tasks.map((t) => {
    const s: TaskSchedule = { id: t.id, roles: {} };
    byId.set(t.id, s);
    return s;
  });

  /**
   * 한 태스크의 직군 일정을 잡는다.
   * anchored=true면 고정일부터 자리를 찾고(예약 단계), 커서는 건드리지 않는다.
   * false면 그 직군의 진행 커서 다음 영업일부터 찾고, 끝나면 커서를 전진시킨다.
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

      const days = task.days[roleId] || 0;
      let result: Date;
      if (days > 0) {
        const depEnds = role.dependsOn.map(effectiveEnd);
        const depMax = depEnds.length
          ? Math.max(...depEnds.map((d) => d.getTime()))
          : 0;
        // 앵커는 고정일부터, 나머지는 그 직군이 진행한 다음 영업일부터 찾는다.
        let earliest =
          anchored && fixedStart
            ? new Date(fixedStart)
            : addWD(roleEnd[roleId], 1, isWD);
        if (depMax) {
          const depFirst = addWD(new Date(depMax), 1, isWD);
          if (depFirst > earliest) earliest = depFirst;
        }
        const segments = take(roleId, earliest, days);
        const start = new Date(segments[0].start);
        const end = new Date(segments[segments.length - 1].end);
        s.roles[roleId] = { start, end, days, segments };
        segments.forEach((seg) => occupy(roleId, seg));
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

    roles.forEach((r) => effectiveEnd(r.id));
  };

  // 1) 앵커가 자기 날짜를 선점한다 (목록 순서).
  tasks.forEach((t) => {
    if (t.fixedStart) place(t, true);
  });
  // 2) 목록 순서대로 진행. 앵커는 이미 잡힌 자리를 커서에 반영만 하고 지나간다.
  tasks.forEach((t) => {
    if (!t.fixedStart) {
      place(t, false);
      return;
    }
    Object.entries(byId.get(t.id)!.roles).forEach(([roleId, r]) => {
      if (r.end > roleEnd[roleId]) roleEnd[roleId] = new Date(r.end);
    });
  });

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
