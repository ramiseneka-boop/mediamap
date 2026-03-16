-- MediaMap.kz — MVP Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'viewer')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. CITIES
-- ============================================
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are readable by all authenticated"
  ON cities FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 3. CATEGORIES (media resource types)
-- ============================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are readable by all authenticated"
  ON categories FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 4. MEDIA RESOURCES (pabliks, telegram channels, bloggers, etc.)
-- ============================================
CREATE TABLE media_resources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'telegram', 'youtube', 'tiktok', '2gis', 'outdoor', 'other')),
  city_id INTEGER REFERENCES cities(id),
  category_id INTEGER REFERENCES categories(id),
  url TEXT,
  username TEXT,
  subscribers INTEGER DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  avg_reach INTEGER DEFAULT 0,
  cost_post NUMERIC(12,2) DEFAULT 0,
  cost_story NUMERIC(12,2) DEFAULT 0,
  cost_reels NUMERIC(12,2) DEFAULT 0,
  sell_post NUMERIC(12,2) DEFAULT 0,
  sell_story NUMERIC(12,2) DEFAULT 0,
  sell_reels NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE media_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media resources readable by authenticated"
  ON media_resources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage media resources"
  ON media_resources FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 5. CLIENTS (CRM)
-- ============================================
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  website TEXT,
  city_id INTEGER REFERENCES cities(id),
  niche TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', '2gis', 'instagram', 'referral', 'ads', 'website', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'negotiation', 'proposal', 'won', 'lost', 'dormant')),
  budget NUMERIC(12,2),
  notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  last_contact_at TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view clients"
  ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 6. SELECTIONS (media plans / proposals)
-- ============================================
CREATE TABLE selections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_id INTEGER REFERENCES clients(id),
  created_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'archived')),
  total_cost NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE selection_items (
  id SERIAL PRIMARY KEY,
  selection_id INTEGER REFERENCES selections(id) ON DELETE CASCADE,
  media_resource_id INTEGER REFERENCES media_resources(id),
  format TEXT DEFAULT 'post' CHECK (format IN ('post', 'story', 'reels', 'post+story', 'package')),
  quantity INTEGER DEFAULT 1,
  cost NUMERIC(12,2) DEFAULT 0,
  price NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view selections"
  ON selections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage selections"
  ON selections FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Authenticated can view selection items"
  ON selection_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage selection items"
  ON selection_items FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 7. ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view activity"
  ON activity_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert activity"
  ON activity_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 8. INDEXES
-- ============================================
CREATE INDEX idx_media_resources_city ON media_resources(city_id);
CREATE INDEX idx_media_resources_category ON media_resources(category_id);
CREATE INDEX idx_media_resources_platform ON media_resources(platform);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_city ON clients(city_id);
CREATE INDEX idx_selections_client ON selections(client_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);

-- ============================================
-- 9. SEED DATA: Cities
-- ============================================
INSERT INTO cities (name, region) VALUES
  ('Алматы', 'Алматы'),
  ('Астана', 'Астана'),
  ('Шымкент', 'Шымкент'),
  ('Караганда', 'Карагандинская'),
  ('Актобе', 'Актюбинская'),
  ('Тараз', 'Жамбылская'),
  ('Павлодар', 'Павлодарская'),
  ('Усть-Каменогорск', 'ВКО'),
  ('Семей', 'ВКО'),
  ('Атырау', 'Атырауская'),
  ('Костанай', 'Костанайская'),
  ('Кызылорда', 'Кызылординская'),
  ('Уральск', 'ЗКО'),
  ('Петропавловск', 'СКО'),
  ('Актау', 'Мангистауская'),
  ('Темиртау', 'Карагандинская'),
  ('Туркестан', 'Туркестанская'),
  ('Кокшетау', 'Акмолинская'),
  ('Талдыкорган', 'Жетысуская'),
  ('Экибастуз', 'Павлодарская');

-- ============================================
-- 10. SEED DATA: Categories
-- ============================================
INSERT INTO categories (name, icon) VALUES
  ('Новости', '📰'),
  ('Развлечения', '🎭'),
  ('Бизнес', '💼'),
  ('Еда', '🍽'),
  ('Авто', '🚗'),
  ('Красота', '💄'),
  ('Спорт', '⚽'),
  ('Мамы и дети', '👶'),
  ('Недвижимость', '🏠'),
  ('Образование', '📚'),
  ('Медицина', '⚕️'),
  ('Юмор', '😂'),
  ('Мода', '👗'),
  ('Путешествия', '✈️'),
  ('Технологии', '💻');

-- ============================================
-- WhatsApp Broadcast Tables
-- ============================================

CREATE TABLE IF NOT EXISTS wa_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wa_broadcasts (
  id SERIAL PRIMARY KEY,
  name TEXT,
  template_id INTEGER REFERENCES wa_templates(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','failed')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wa_broadcast_recipients (
  id SERIAL PRIMARY KEY,
  broadcast_id INTEGER REFERENCES wa_broadcasts(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','replied','failed')),
  sent_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read wa_templates" ON wa_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write wa_templates" ON wa_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update wa_templates" ON wa_templates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read wa_broadcasts" ON wa_broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write wa_broadcasts" ON wa_broadcasts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update wa_broadcasts" ON wa_broadcasts FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read wa_broadcast_recipients" ON wa_broadcast_recipients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write wa_broadcast_recipients" ON wa_broadcast_recipients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update wa_broadcast_recipients" ON wa_broadcast_recipients FOR UPDATE TO authenticated USING (true);

-- Seed templates
INSERT INTO wa_templates (name, niche, message) VALUES
('🍽️ Рестораны/Кафе', 'Рестораны/Кафе', E'Здравствуйте! 👋\n\nМы — Pabliki.kz, городская медиасеть Казахстана. Помогаем ресторанам и кафе привлекать гостей через рекламу в Instagram-пабликах.\n\n🔥 Что мы предлагаем:\n✅ Размещение в 700+ городских пабликах\n✅ Охват от 50 000 до 500 000 подписчиков\n✅ Нативный формат — не выглядит как реклама\n✅ Результат уже в первые дни\n\n📊 Кейс: ресторан в Алматы получил 200+ бронирований за неделю с одного размещения.\n\nХотите узнать, сколько стоит реклама для вашего заведения? Подготовим бесплатный медиаплан! 📋'),
('💇 Салоны красоты', 'Салоны красоты', E'Здравствуйте! 👋\n\nМы — Pabliki.kz, городская медиасеть. Помогаем салонам красоты привлекать клиентов через Instagram-паблики вашего города.\n\n💅 Почему это работает:\n✅ Ваша реклама в пабликах, которые читает ваша ЦА\n✅ Нативный формат — сохраняют и пересылают\n✅ Охват от 50К до 500К подписчиков\n✅ Стоимость от 15 000₸ за размещение\n\n📊 Кейс: салон красоты в Астане — 150 новых записей за 5 дней.\n\nПодготовим бесплатную подборку пабликов для вашего города?'),
('🏥 Медицинские центры', 'Медицина', E'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть Казахстана. Помогаем медицинским центрам привлекать пациентов через рекламу в Instagram-пабликах.\n\n🏥 Преимущества:\n✅ 700+ пабликов в 14 регионах КЗ\n✅ Аудитория 93М+ подписчиков\n✅ Нативный формат — доверие аудитории\n✅ Таргетинг по городу и категории\n\n📊 Медицинские центры получают в среднем 80-120 обращений с одной кампании.\n\nГотовы подготовить персональный медиаплан для вашей клиники!'),
('🏋️ Фитнес/Спорт', 'Фитнес', E'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть. Помогаем фитнес-клубам и спортзалам привлекать новых клиентов.\n\n💪 Что предлагаем:\n✅ Реклама в городских Instagram-пабликах\n✅ Охват активной аудитории вашего города\n✅ Нативный формат — люди сохраняют и делятся\n✅ Идеально для акций и сезонных предложений\n\n📊 Фитнес-клуб в Караганде: +300 заявок на пробное занятие за 2 недели.\n\nХотите узнать стоимость? Подготовим медиаплан бесплатно!'),
('🎓 Образование', 'Образование', E'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть. Помогаем образовательным центрам и школам привлекать учеников через Instagram-паблики.\n\n🎓 Почему паблики:\n✅ Мамочки и родители — основная аудитория городских пабликов\n✅ 700+ пабликов в 14 регионах\n✅ Нативный формат — высокое доверие\n✅ Отлично работает для набора на курсы и в школы\n\nПодготовим персональную подборку пабликов для вашего города?'),
('🏠 Недвижимость', 'Недвижимость', E'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть Казахстана. Помогаем застройщикам и агентствам недвижимости привлекать покупателей.\n\n🏠 Наши возможности:\n✅ 700+ городских Instagram-пабликов\n✅ Охват 93М+ подписчиков в 14 регионах\n✅ Идеально для ЖК, квартир, коммерческой недвижимости\n✅ Формат «городская новость» — максимальное доверие\n\n📊 Застройщик в Алматы: 500+ обращений за месяц с 3 размещений.\n\nГотовы обсудить стратегию продвижения ваших объектов!');
