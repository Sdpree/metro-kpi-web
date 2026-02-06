import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../state/AuthContext'
import type { MetricKey, Store } from '../../lib/types'
import { currentYearMonth, yyyyMmDd } from '../../lib/date'

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'PPD', label: 'PPD' },
  { key: 'TABLETS', label: 'Tablets' },
  { key: 'HINTS', label: 'HINTS' },
  { key: 'MAGENTA', label: 'Magenta' },
  { key: 'TOTAL_BOXES', label: 'Total Boxes' },
  { key: 'ACCESSORIES', label: 'Accessories' }
]

export default function EntryPage() {
  const { profile, session } = useAuth()
  const todayStr = yyyyMmDd(new Date())
  const [date, setDate] = useState(todayStr)
  const [stores, setStores] = useState<Store[]>([])
  const [storeId, setStoreId] = useState<string>('')
  const [values, setValues] = useState<Record<MetricKey, string>>(() => ({
    PPD: '',
    TABLETS: '',
    HINTS: '',
    MAGENTA: '',
    TOTAL_BOXES: '',
    ACCESSORIES: ''
  }))
  const [notesEmployee, setNotesEmployee] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return
    if (!storeId) { setMsg('Select a store'); return }

    setBusy(true)
    setMsg(null)

    try {
      // Upsert daily_entries (one per user/store/date)
      const { data: existing, error: exErr } = await supabase
        .from('daily_entries')
        .select('id')
        .eq('store_id', storeId)
        .eq('user_id', session.user.id)
        .eq('entry_date', date)
        .maybeSingle()
      if (exErr) throw exErr

      let entryId = existing?.id as string | undefined

      if (!entryId) {
        const { data: ins, error: insErr } = await supabase
          .from('daily_entries')
          .insert({
            store_id: storeId,
            user_id: session.user.id,
            entry_date: date,
            notes_employee: notesEmployee || null
          })
          .select('id')
          .single()
        if (insErr) throw insErr
        entryId = ins.id
      } else {
        const { error: upErr } = await supabase
          .from('daily_entries')
          .update({ notes_employee: notesEmployee || null, updated_at: new Date().toISOString() })
          .eq('id', entryId)
        if (upErr) throw upErr

        // delete previous line items for that entry (simple replace)
        const { error: delErr } = await supabase
          .from('entry_line_items')
          .delete()
          .eq('daily_entry_id', entryId)
        if (delErr) throw delErr
      }

      const lineItems = METRICS
        .map(m => ({ metric_key: m.key, value: Number(values[m.key] || 0) || 0 }))
        .filter(li => li.value !== 0)

      if (lineItems.length > 0) {
        const { error: liErr } = await supabase
          .from('entry_line_items')
          .insert(lineItems.map(li => ({
            daily_entry_id: entryId,
            store_id: storeId,
            user_id: session.user.id,
            entry_date: date,
            metric_key: li.metric_key,
            value: li.value
          })))
        if (liErr) throw liErr
      }

      setMsg('Saved')
    } catch (err: any) {
      console.error(err)
      setMsg(err?.message ?? 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <h3 style={{ marginTop: 0 }}>Daily Entry</h3>
      <form onSubmit={onSubmit}>
        <div className="row">
          <label style={{ flex: 1, minWidth: 240 }}>
            <div className="label">Store</div>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.store_name} ({s.store_code})</option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 200 }}>
            <div className="label">Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }} />
          </label>
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          {METRICS.map((m) => (
            <label key={m.key} style={{ flex: 1, minWidth: 200 }}>
              <div className="label">{m.label}</div>
              <input
                inputMode="numeric"
                value={values[m.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [m.key]: e.target.value.replace(/[^\d.]/g, '') }))}
                placeholder="0"
                style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }}
              />
            </label>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 10 }}>
          <div className="label">Employee notes</div>
          <textarea value={notesEmployee} onChange={(e) => setNotesEmployee(e.target.value)} rows={3} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }} />
        </label>

        <div className="row" style={{ marginTop: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save entry'}</button>
          <div className="label">{msg ?? ''}</div>
        </div>
      </form>

      <div className="label" style={{ marginTop: 10 }}>
        Note: points/penalties are computed server-side later (Phase 2). This screen only records entries.
      </div>
    </div>
  )
}
