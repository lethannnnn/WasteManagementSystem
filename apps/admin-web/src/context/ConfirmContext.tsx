import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export interface ConfirmOptions {
  title:        string
  message:      string
  confirmText?: string
  cancelText?:  string
  variant?:     'danger' | 'default'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false))

interface PendingConfirm {
  opts:    ConfirmOptions
  resolve: (v: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => setPending({ opts, resolve }))
  , [])

  function handle(v: boolean) {
    pending?.resolve(v)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmModal
          {...pending.opts}
          onConfirm={() => handle(true)}
          onCancel={() => handle(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)

function ConfirmModal({
  title, message,
  confirmText = 'Confirm', cancelText = 'Cancel',
  variant = 'default',
  onConfirm, onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          {variant === 'danger' && (
            <div className="confirm-icon danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          )}
          <h3 className="confirm-title">{title}</h3>
        </div>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>{cancelText}</button>
          <button className={`confirm-ok-btn ${variant}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
