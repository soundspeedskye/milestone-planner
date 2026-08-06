import { usePlannerStore } from "../../store/usePlannerStore";

export function Legend() {
  const roles = usePlannerStore((s) => s.roles);
  return (
    <div className="legend">
      {roles.map((r) => (
        <div className="legend-item" key={r.id}>
          <div className="legend-dot" style={{ background: r.palette.bar }} />
          {r.name}
        </div>
      ))}
      <div className="legend-item">
        <div
          className="legend-dot"
          style={{ background: "#FEF0F0", border: "1px solid #f0c0c0" }}
        />
        공휴일
      </div>
      <div className="legend-item">
        <div
          className="legend-dot"
          style={{ background: "#FBF3F3", border: "1px solid #ebd5d5" }}
        />
        주말
      </div>
      <div className="legend-item">
        <div
          className="legend-dot"
          style={{
            border: "1px solid #ccd8e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontSize: 7,
            fontWeight: 700,
            color: "#0C447C",
          }}
        >
          연
        </div>
        직군 휴무(연차)
      </div>
      <div className="legend-item">
        <div className="legend-gap" />
        공백
      </div>
    </div>
  );
}
