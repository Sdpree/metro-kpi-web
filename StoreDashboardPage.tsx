import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { MetricKey, Store } from '../../lib/types'
import { currentYearMonth, yyyyMmDd, daysInMonth } from '../../lib/date'

type MetricRow = { metric: MetricKey; today: number; mtd: number; target: number; remaining: number; reqPerDay: number; avgPerDay: number }
const METRICS: MetricKey[] = ['PPD', 'TABLETS', 'HINTS', 'MAGENTA', 'TOTAL_BOXES', 'ACCESSORIES']

export default function StoreDashboardPage() {
  const { storeId } = useParams()
  const { year, month } = currentYearMonth()
  const todayStr = yyyyMmDd(new Date())
  const daysElapsed = useMemo(() => new Date().getDate(), [])
  const dim = useMemo(() => daysInMonth(year, month), [year, month])
  const daysRemaining = useMemo(() => Math.max(0, dim - daysElapsed), [dim, daysElapsed])

  const [store, setStore] = useState<Store | null>(null)
  const [rows, setRows] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!storeId) return
    const run = async () => {
      setLoading(true)

      const { data: sData, error: sErr } = await supabase
        .from('stores')
        .select('id, store_code, store_name, is_active')
        .eq('id', storeId)
        .single()
      if (sErr) throw sErr
      setStore(sData as Store)

      const { data: tData, error: tErr } = await supabase
        .from('monthly_targets')
        .select('metric_key, target_value')
        .eq('store_id', storeId)
        .eq('year', year)
        .eq('month', month)
      if (tErr) throw tErr
      const targets = new Map<MetricKey, number>()
      ;(tData ?? []).forEach((r: any) => targets.set(r.metric_key as MetricKey, Number(r.target_value)))

      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const { data: liData, error: liErr } = await supabase
        .from('entry_line_items')
        .select('metric_key, value, entry_date')
        .eq('store_id', storeId)
        .gte('entry_date', monthStart)
        .lte('entry_date', todayStr)
      if (liErr) throw liErr

      const todayAgg = new Map<MetricKey, number>()
      const mtdAgg = new Map<MetricKey, number>()
      METRICS.forEach((m) => { todayAgg.set(m, 0); mtdAgg.set(m, 0) })

      ;(liData ?? []).forEach((r: any) => {
        const m = r.metric_key as MetricKey
        const v = Number(r.value) || 0
        mtdAgg.set(m, (mtdAgg.get(m) ?? 0) + v)
        if (r.entry_date === todayStr) todayAgg.set(m, (todayAgg.get(m) ?? 0) + v)
      })

      const nextRows: MetricRow[] = METRICS.map((m) => {
        const target = targets.get(m) ?? 0
        const mtd = mtdAgg.get(m) ?? 0
        const today = todayAgg.get(m) ?? 0
        const remaining = Math.max(0, target - mtd)
        const reqPerDay = daysRemaining > 0 ? remaining / daysRemaining : 0
        const avgPerDay = daysElapsed > 0 ? mtd / daysElapsed : 0
        return { metric: m, today, mtd, target, remaining, reqPerDay, avgPerDay }
      })

      setRows(nextRows)
      setLoading(false)
    }

    run().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [storeId, year, month, todayStr, daysElapsed, daysRemaining])

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card">
        <div className="label">Store</div>
        <div className="value">{store ? `${store.store_name} (${store.store_code})` : '—'}</div>
        <div className="label" style={{ marginTop: 8 }}>
          Snapshot: {year}-{String(month).padStart(2, '0')} • Through {todayStr} • Days elapsed {daysElapsed} • Remaining {daysRemaining}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Metrics</h3>
        {loading ? <div className="label">Loading…</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Today</th>
              <th>MTD</th>
              <th>Target</th>
              <th>Remaining</th>
              <th>Required/day</th>
              <th>Avg/day</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric}>
                <td>{r.metric}</td>
                <td>{r.today.toFixed(0)}</td>
                <td>{r.mtd.toFixed(0)}</td>
                <td>{r.target.toFixed(0)}</td>
                <td>{r.remaining.toFixed(0)}</td>
                <td>{r.reqPerDay.toFixed(2)}</td>
                <td>{r.avgPerDay.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="label">
        Phase 2 will add: employee ranking, points ledger, goals, notifications, exports.
      </div>
    </div>
  )
}
