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
        <div className="legend-dot" style={{ background: '#FBF3F3', border: '1px solid #ebd5d5' }} />
        주말
      </div>
      <div className="legend-item">
        <div
          className="legend-dot"
          style={{
            backgroundColor: '#EDF2F9',
            backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 2px, #BCC7D8 2px 3px)',
            border: '1px solid #ccd8e8',
          }}
        />
        직군 휴무
      </div>
      <div className="legend-item">
        <div className="legend-gap" />
        공백
      </div>
    </div>
  )
}
