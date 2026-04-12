import type { User } from '../types'

interface Props {
  user:    User | null
  onClose: () => void
}

const TYPE_COLOR: Record<string, string> = {
  Donor:     '#166534',
  Collector: '#1e40af',
  Sponsor:   '#92400e',
  Admin:     '#581c87',
}

const TYPE_BG: Record<string, string> = {
  Donor:     '#dcfce7',
  Collector: '#dbeafe',
  Sponsor:   '#fef3c7',
  Admin:     '#f3e8ff',
}

export default function UserDetailPanel({ user, onClose }: Props) {
  if (!user) return null

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-panel-header">
          <h3>User Details</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="detail-panel-body">
          <div className="detail-avatar-section">
            <div className="detail-avatar" style={{ background: TYPE_BG[user.type], color: TYPE_COLOR[user.type] }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="detail-name">{user.name}</h2>
              <span className={`user-type ${user.type.toLowerCase()}`}>{user.type}</span>
            </div>
          </div>

          <div className="detail-fields">
            <div className="detail-field">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Status</span>
              <span className={`status ${user.status.toLowerCase()}`}>{user.status}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Joined</span>
              <span className="detail-value">{user.joinDate}</span>
            </div>

            {user.type === 'Donor' && (
              <div className="detail-field">
                <span className="detail-label">Points</span>
                <span className="detail-value detail-highlight">{(user.points ?? 0).toLocaleString()} pts</span>
              </div>
            )}
            {user.type === 'Collector' && (
              <div className="detail-field">
                <span className="detail-label">Total Pickups</span>
                <span className="detail-value detail-highlight">{user.collections ?? 0}</span>
              </div>
            )}
            {user.type === 'Sponsor' && user.company_name && (
              <div className="detail-field">
                <span className="detail-label">Company</span>
                <span className="detail-value">{user.company_name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
