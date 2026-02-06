import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Store } from '../../lib/types'

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_code, store_name, is_active')
        .eq('is_active', true)
        .order('store_name', { ascending: true })
      if (error) throw error
      setStores((data ?? []) as Store[])
      setLoading(false)
    }
    load().catch((e) => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Stores</h3>
      {loading ? <div className="label">Loading…</div> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Store</th>
            <th>Code</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id}>
              <td>{s.store_name}</td>
              <td>{s.store_code}</td>
              <td><a className="badge" href={`/stores/${s.id}`}>Open</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
