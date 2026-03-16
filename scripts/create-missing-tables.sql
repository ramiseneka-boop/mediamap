-- ═══════════════════════════════════════════════
-- MediaMap: Недостающие таблицы
-- Запустить в Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Подборки (selections)
CREATE TABLE IF NOT EXISTS selections (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'archived')),
  total_cost NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  margin_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_price > 0 THEN ROUND(((total_price - total_cost) / total_price) * 100, 1) ELSE 0 END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Элементы подборки (selection_items)
CREATE TABLE IF NOT EXISTS selection_items (
  id BIGSERIAL PRIMARY KEY,
  selection_id BIGINT NOT NULL REFERENCES selections(id) ON DELETE CASCADE,
  media_resource_id BIGINT NOT NULL REFERENCES media_resources(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'post' CHECK (format IN ('post', 'story', 'post_story', 'reels')),
  cost NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Лог активности
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id BIGINT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Индексы
CREATE INDEX IF NOT EXISTS idx_selections_client ON selections(client_id);
CREATE INDEX IF NOT EXISTS idx_selections_status ON selections(status);
CREATE INDEX IF NOT EXISTS idx_selection_items_selection ON selection_items(selection_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- 5. RLS
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON selections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON selection_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Триггер auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS selections_updated_at ON selections;
CREATE TRIGGER selections_updated_at
  BEFORE UPDATE ON selections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
