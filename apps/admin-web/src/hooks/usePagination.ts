import { useState, useMemo } from 'react'

export function usePagination<T>(data: T[], defaultSize = 10) {
  const [page, setPage]         = useState(1)
  const [pageSize, setRawSize]  = useState(defaultSize)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const pageData = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, safePage, pageSize])

  function setPageSize(size: number) {
    setRawSize(size)
    setPage(1)
  }

  return { page: safePage, setPage, pageSize, setPageSize, pageData, totalPages, total: data.length }
}
