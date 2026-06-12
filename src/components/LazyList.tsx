'use client'
import { useEffect, useRef, useState } from 'react'
import SpinFlag from '@/components/SpinFlag'

interface Props<T> {
  items: T[]
  pageSize?: number
  renderItem: (item: T, index: number) => React.ReactNode
  skeleton?: React.ReactNode
}

export default function LazyList<T>({ items, pageSize = 10, renderItem, skeleton }: Props<T>) {
  const [visible, setVisible] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisible(pageSize)
  }, [items.length, pageSize])

  useEffect(() => {
    if (visible >= items.length) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setVisible(v => Math.min(v + pageSize, items.length)) },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, items.length, pageSize])

  return (
    <>
      {items.slice(0, visible).map((item, i) => renderItem(item, i))}
      {visible < items.length && (
        <div ref={sentinelRef} className="py-2 flex justify-center">
          {skeleton ?? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <SpinFlag size={20} />
              Đang tải thêm...
            </div>
          )}
        </div>
      )}
    </>
  )
}
