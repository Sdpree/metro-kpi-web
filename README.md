# Metro KPI Web (Netlify + Supabase)

This is a starter web app for:
- Login (Supabase Auth)
- Daily entry capture
- Store dashboards (Today / MTD / Target / Remaining / Required per day / Avg per day)
- Netlify SPA routing (`public/_redirects`)

## 1) Environment Variables

### Local (.env)
Create `.env` (do NOT commit it):

```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Netlify
Site settings → Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 2) Supabase Setup (SQL)

Create these tables in Supabase SQL Editor.

### Stores
```sql
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  store_code text not null unique,
  store_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### Profiles (1:1 with auth.users)
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('ADMIN','MANAGER','EMPLOYEE')),
  primary_store_id uuid references public.stores(id),
  created_at timestamptz not null default now()
);
```

### Daily entries
```sql
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  user_id uuid not null references auth.users(id),
  entry_date date not null,
  notes_employee text,
  notes_manager text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id, entry_date)
);
```

### Entry line items (flattened for easy aggregates)
```sql
create table if not exists public.entry_line_items (
  id uuid primary key default gen_random_uuid(),
  daily_entry_id uuid not null references public.daily_entries(id) on delete cascade,
  store_id uuid not null references public.stores(id),
  user_id uuid not null references auth.users(id),
  entry_date date not null,
  metric_key text not null check (metric_key in ('PPD','TABLETS','HINTS','MAGENTA','TOTAL_BOXES','ACCESSORIES')),
  value numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists entry_line_items_store_date_idx on public.entry_line_items(store_id, entry_date);
create index if not exists entry_line_items_user_date_idx on public.entry_line_items(user_id, entry_date);
```

### Monthly targets
```sql
create table if not exists public.monthly_targets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  year int not null,
  month int not null check (month between 1 and 12),
  metric_key text not null check (metric_key in ('PPD','TABLETS','HINTS','MAGENTA','TOTAL_BOXES','ACCESSORIES')),
  target_value numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, year, month, metric_key)
);
create index if not exists monthly_targets_store_month_idx on public.monthly_targets(store_id, year, month);
```

## 3) RLS (starter)

Enable RLS and start simple. You can tighten later.

```sql
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.daily_entries enable row level security;
alter table public.entry_line_items enable row level security;
alter table public.monthly_targets enable row level security;

-- profiles: user reads own row
create policy "profiles read own" on public.profiles
for select using (auth.uid() = id);

-- stores: allow read for authenticated users
create policy "stores read auth" on public.stores
for select using (auth.role() = 'authenticated');

-- monthly targets: allow read for authenticated users
create policy "targets read auth" on public.monthly_targets
for select using (auth.role() = 'authenticated');

-- daily entries: user can read/write own
create policy "entries read own" on public.daily_entries
for select using (auth.uid() = user_id);
create policy "entries insert own" on public.daily_entries
for insert with check (auth.uid() = user_id);
create policy "entries update own" on public.daily_entries
for update using (auth.uid() = user_id);

-- line items: user can read/write own
create policy "lineitems read own" on public.entry_line_items
for select using (auth.uid() = user_id);
create policy "lineitems insert own" on public.entry_line_items
for insert with check (auth.uid() = user_id);
create policy "lineitems delete own" on public.entry_line_items
for delete using (auth.uid() = user_id);
```

## 4) Netlify Deploy Settings

Build command: `npm run build`  
Publish directory: `dist`

SPA routing is already set via `public/_redirects`.

## 5) Local Run

```bash
npm install
npm run dev
```

---
Generated: 2026-02-06
