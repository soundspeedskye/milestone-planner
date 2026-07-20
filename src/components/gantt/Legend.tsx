import { usePlannerStore } from '../../store/usePlannerStore'

export function Legend() {
  const roles = usePlannerStore(s => s.roles)
  return (
    <div className="legend">
      {roles.map(r => (
        <div className="legend-item" key={r.id}>
          <div className="legend-dot" style={{ background: r.palette.bar }} />
          {r.name}
        </div>
      ))}
      <div className="legend-item">
        <div className="legend-dot" style={{ background: '#FEF0F0', border: '1px solid #f0c0c0' }} />
        공휴일
      </div>
      <div className="legend-item">
        <div className="legend-gap" />
        공백
      </div>
    </div>
  )
}
