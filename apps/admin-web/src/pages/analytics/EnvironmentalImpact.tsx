interface Impact {
  co2Saved: number
  energySaved: number
  waterSaved: number
  treesSaved: number
  landfillDiverted: number
}

interface Props {
  impact?: Impact
}

const ITEMS = [
  { key: 'co2Saved',         icon: '&#x1F30D;', label: 'CO₂ Saved',         unit: 'kg',   desc: 'Carbon emissions prevented'   },
  { key: 'energySaved',      icon: '&#x26A1;',  label: 'Energy Saved',       unit: 'kWh',  desc: 'Electricity equivalent'        },
  { key: 'waterSaved',       icon: '&#x1F4A7;', label: 'Water Saved',        unit: 'L',    desc: 'Fresh water conserved'         },
  { key: 'treesSaved',       icon: '&#x1F333;', label: 'Trees Saved',        unit: '',     desc: 'Tree equivalents'              },
  { key: 'landfillDiverted', icon: '&#x1F5D1;', label: 'Landfill Diverted',  unit: 'tons', desc: 'Waste diverted from landfills' },
] as const

export default function EnvironmentalImpact({ impact }: Props) {
  return (
    <>
      <div className="chart-header">
        <h3>Environmental Impact</h3>
        <span className="chart-subtitle">Real-time environmental benefits from recycling</span>
      </div>
      <div className="environmental-impact">
        <div className="impact-metrics">
          {ITEMS.map(item => (
            <div key={item.key} className="impact-card">
              <div className="impact-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <div className="impact-content">
                <h4>{item.label}</h4>
                <span className="impact-value">
                  {impact?.[item.key] ?? 0} {item.unit}
                </span>
                <span className="impact-description">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
