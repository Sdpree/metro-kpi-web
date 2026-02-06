export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

export type Profile = {
  id: string
  full_name: string | null
  role: Role
  primary_store_id: string | null
}

export type Store = {
  id: string
  store_code: string
  store_name: string
  is_active: boolean
}

export type MetricKey = 'PPD' | 'TABLETS' | 'HINTS' | 'MAGENTA' | 'TOTAL_BOXES' | 'ACCESSORIES'

export type MonthlyTarget = {
  store_id: string
  year: number
  month: number
  metric_key: MetricKey
  target_value: number
}

export type DailyEntry = {
  id: string
  store_id: string
  user_id: string
  entry_date: string // YYYY-MM-DD
  notes_employee: string | null
  notes_manager: string | null
  created_at: string
  updated_at: string
}

export type EntryLineItem = {
  daily_entry_id: string
  metric_key: MetricKey
  value: number
}
