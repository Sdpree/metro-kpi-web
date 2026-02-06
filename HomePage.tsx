import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../state/AuthContext'
import type { MetricKey, Store } from '../../lib/types'
import { currentYearMonth, yyyyMmDd, daysInMonth } from '../../lib/date'

type MetricCard = { metric: MetricKey; today: number; mtd: number; target: number; remaining: number; reqPerDay: number; avgPerDay: number }

const METRICS: MetricKey[] = ['PPD', 'TABLETS', 'HINTS', 'MAGENTA', 'TOTAL_BOXES', 'ACCESSORIES']

export default function HomePage() {
  const { profile } = useAuth()
  const { year, month } = currentYearMonth()
  const todayStr = yyyyMmDd(new Date())

  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState<string>('')
  const [cards, setCards] = useState<MetricCard[]>([])
  const [loading, setLoading] = useState(true)

  const daysElapsed = useMemo(() => new Date().getDate(), [])
  const dim = useMemo(() => daysInMonth(year, month), [year, month])
  const daysRemaining = useMemo(() => Math.max(0, dim - daysElapsed), [dim, daysElapsed])

  useEffect(() => {
    const loadStores = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_code, store_name, is_active')
        .eq('is_active', true)
        .order('store_name', { ascending: true })
      if (error) throw error
      setStores((data ?? []) as Store[])

      const defaultStore = profile?.primary_store_id ?? (data?.[0]?.id ?? '')
      setStoreId(defaultStore)
    }
    loadStores().catch(console.error)
  }, [profile?.primary_store_id])

  useEffect(() => {
    if (!storeId) return
    const run = async () => {
      setLoading(true)

      // Targets for month
      const { data: tData, error: tErr } = await supabase
        .from('monthly_targets')
        .select('metric_key, target_value')
        .eq('store_id', storeId)
        .eq('year', year)
        .eq('month', month)
      if (tErr) throw tErr

      const targets = new Map<MetricKey, number>()
      ;(tData ?? []).forEach((r: any) => targets.set(r.metric_key as MetricKey, Number(r.target_value)))

      // Entry line items today and MTD (store-level aggregate)
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
        if (r.entry_date === todayStr) {
          todayAgg.set(m, (todayAgg.get(m) ?? 0) + v)
        }
      })

      const nextCards: MetricCard[] = METRICS.map((m) => {
        const target = targets.get(m) ?? 0
        const mtd = mtdAgg.get(m) ?? 0
        const today = todayAgg.get(m) ?? 0
        const remaining = Math.max(0, target - mtd)
        const reqPerDay = daysRemaining > 0 ? remaining / daysRemaining : 0
        const avgPerDay = daysElapsed > 0 ? mtd / daysElapsed : 0
        return { metric: m, today, mtd, target, remaining, reqPerDay, avgPerDay }
      })

      setCards(nextCards)
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
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label">Snapshot</div>
            <div className="value">{year}-{String(month).padStart(2, '0')} • Through {todayStr}</div>
          </div>
          <div style={{ display: 'grid', gap: 6, minWidth: 320 }}>
            <div className="label">Store</div>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.store_name} ({s.store_code})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="label" style={{ marginTop: 10 }}>
          Days elapsed: {daysElapsed} • Days remaining: {daysRemaining}
        </div>
      </div>

      <div className="grid2">
        {cards.map((c) => (
          <div className="card" key={c.metric}>
            <div className="label">{c.metric}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="kpi">
                <div className="label">Today</div>
                <div className="value">{c.today.toFixed(0)}</div>
              </div>
              <div className="kpi">
                <div className="label">MTD</div>
                <div className="value">{c.mtd.toFixed(0)}</div>
              </div>
              <div className="kpi">
                <div className="label">Target</div>
                <div className="value">{c.target.toFixed(0)}</div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <div className="kpi">
                <div className="label">Remaining</div>
                <div className="value">{c.remaining.toFixed(0)}</div>
              </div>
              <div className="kpi">
                <div className="label">Required/day</div>
                <div className="value">{c.reqPerDay.toFixed(2)}</div>
              </div>
              <div className="kpi">
                <div className="label">Avg/day</div>
                <div className="value">{c.avgPerDay.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? <div className="label">Loading…</div> : null}
    </div>
  )
}
