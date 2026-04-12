interface PaginationProps {
  page:       number
  totalPages: number
  pageSize:   number
  total:      number
  onPage:     (p: number) => void
  onSize:     (s: number) => void
}

export default function Pagination({ page, totalPages, pageSize, total, onPage, onSize }: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span>{total === 0 ? 'No results' : `${start}–${end} of ${total}`}</span>
        <select
          className="page-size-select"
          value={pageSize}
          onChange={e => onSize(Number(e.target.value))}
        >
          {[10, 25, 50].map(s => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="pg-btn" onClick={() => onPage(1)}          disabled={page === 1}>«</button>
        <button className="pg-btn" onClick={() => onPage(page - 1)}   disabled={page === 1}>‹</button>
        <span className="pg-current">{page} / {totalPages}</span>
        <button className="pg-btn" onClick={() => onPage(page + 1)}   disabled={page === totalPages}>›</button>
        <button className="pg-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages}>»</button>
      </div>
    </div>
  )
}
