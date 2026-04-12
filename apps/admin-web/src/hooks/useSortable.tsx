import { useMemo, useState } from 'react'

export function useSortable<T>(data: T[]) {
  const [sortKey, setSortKey]   = useState<keyof T | null>(null)
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === bv) return 0
      const cmp = av === null || av === undefined ? 1
                : bv === null || bv === undefined ? -1
                : av < bv ? -1 : 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  function toggle(key: keyof T) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: keyof T }) {
    if (sortKey !== col) return <span className="sort-icon neutral">↕</span>
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return { sorted, sortKey, sortDir, toggle, SortIcon }
}
