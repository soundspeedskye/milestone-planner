import { useState } from "react";
import { DEFAULT_HOLIDAYS } from "../../constants/holidays";
import { usePlannerStore } from "../../store/usePlannerStore";

export function HolidaySettings() {
  const holidays = usePlannerStore((s) => s.holidays);
  const roles = usePlannerStore((s) => s.roles);
  const addCustomHoliday = usePlannerStore((s) => s.addCustomHoliday);
  const removeCustomHoliday = usePlannerStore((s) => s.removeCustomHoliday);
  const toggleDefaultHoliday = usePlannerStore((s) => s.toggleDefaultHoliday);
  const addRoleHoliday = usePlannerStore((s) => s.addRoleHoliday);
  const removeRoleHoliday = usePlannerStore((s) => s.removeRoleHoliday);
  const [newDate, setNewDate] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [roleDate, setRoleDate] = useState("");

  // 직군이 삭제되면 선택값이 없는 직군을 가리킬 수 있어 첫 직군으로 되돌린다
  const selectedRole = roles.some((r) => r.id === roleId)
    ? roleId
    : (roles[0]?.id ?? "");
  const roleEntries = roles
    .map((r) => ({ role: r, dates: holidays.byRole[r.id] ?? [] }))
    .filter((e) => e.dates.length > 0);

  const byYear = DEFAULT_HOLIDAYS.reduce<Record<string, string[]>>((acc, d) => {
    const y = d.slice(0, 4);
    (acc[y] ??= []).push(d);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort();
  const yearRange = years.length
    ? `${years[0]}~${years[years.length - 1]}`
    : "";

  return (
    <div className="holiday-cards">
      <section className="holiday-card">
        <div className="settings-section-title">기본 공휴일 ({yearRange})</div>
        <div className="modal-hint">
          기본 휴무일입니다. <br />
          체크를 해제하면 그 날은 영업일로 계산돼요.
        </div>
        <div className="holiday-body">
          <div className="holiday-list">
            {Object.entries(byYear).map(([year, dates]) => (
              <div key={year}>
                <div className="holiday-year">{year}년</div>
                {dates.map((d) => {
                  const disabled = holidays.disabled.includes(d);
                  return (
                    <label
                      className="holiday-item"
                      key={d}
                      style={{ cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={!disabled}
                        onChange={() => toggleDefaultHoliday(d)}
                      />
                      <span className={disabled ? "off" : ""}>{d}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="holiday-card">
        <div className="settings-section-title">휴무일 설정</div>
        <div className="modal-hint">
          법정 휴일 외 휴무일을 직접 추가할 수 있습니다.
        </div>
        <div className="holiday-body">
          <div className="holiday-add">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <button
              className="btn-save"
              onClick={() => {
                if (!newDate) return;
                addCustomHoliday(newDate);
                setNewDate("");
              }}
            >
              추가
            </button>
          </div>
          {holidays.custom.length > 0 ? (
            <div className="holiday-list">
              {holidays.custom.map((d) => (
                <div className="holiday-item" key={d}>
                  <span style={{ flex: 1 }}>{d}</span>
                  <button
                    className="btn-remove btn-remove-icon"
                    onClick={() => removeCustomHoliday(d)}
                    aria-label={`${d} 휴무일 삭제`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="holiday-empty">직접 추가한 휴무일이 없어요.</div>
          )}
        </div>
      </section>

      <section className="holiday-card">
        <div className="settings-section-title">직군별 휴무일</div>
        <div className="modal-hint">
          특정 직군만 쉬는 날을 추가할 수 있습니다.
        </div>
        <div className="holiday-body">
          {roles.length === 0 ? (
            <div className="holiday-empty">직군을 먼저 추가해 주세요.</div>
          ) : (
            <>
              <div className="holiday-add role-holiday-add">
                <select
                  value={selectedRole}
                  onChange={(e) => setRoleId(e.target.value)}
                  aria-label="휴무일을 적용할 직군"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={roleDate}
                  onChange={(e) => setRoleDate(e.target.value)}
                />
                <button
                  className="btn-save"
                  onClick={() => {
                    if (!roleDate || !selectedRole) return;
                    addRoleHoliday(selectedRole, roleDate);
                    setRoleDate("");
                  }}
                >
                  추가
                </button>
              </div>
              {roleEntries.length > 0 ? (
                <div className="holiday-list">
                  {roleEntries.map(({ role, dates }) => (
                    <div key={role.id}>
                      <div
                        className="holiday-year"
                        style={{ color: role.palette.header }}
                      >
                        {role.name}
                      </div>
                      {dates.map((d) => (
                        <div className="holiday-item" key={d}>
                          <span style={{ flex: 1 }}>{d}</span>
                          <button
                            className="btn-remove btn-remove-icon"
                            onClick={() => removeRoleHoliday(role.id, d)}
                            aria-label={`${role.name} ${d} 휴무일 삭제`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="holiday-empty">직군별 휴무일이 없어요.</div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
