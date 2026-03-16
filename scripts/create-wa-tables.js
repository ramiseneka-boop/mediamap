const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
)

async function main() {
  // Try creating tables via rpc/sql
  const sql = `
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

    -- RLS
    ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE wa_broadcasts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE wa_broadcast_recipients ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      CREATE POLICY "Allow authenticated read wa_templates" ON wa_templates FOR SELECT TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Allow authenticated insert wa_templates" ON wa_templates FOR INSERT TO authenticated WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Allow authenticated update wa_templates" ON wa_templates FOR UPDATE TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE POLICY "Allow authenticated read wa_broadcasts" ON wa_broadcasts FOR SELECT TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Allow authenticated insert wa_broadcasts" ON wa_broadcasts FOR INSERT TO authenticated WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Allow authenticated update wa_broadcasts" ON wa_broadcasts FOR UPDATE TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      CREATE POLICY "Allow authenticated read wa_broadcast_recipients" ON wa_broadcast_recipients FOR SELECT TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Allow authenticated insert wa_broadcast_recipients" ON wa_broadcast_recipients FOR INSERT TO authenticated WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE POLICY "Allow authenticated update wa_broadcast_recipients" ON wa_broadcast_recipients FOR UPDATE TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `

  const { error } = await supabase.rpc('exec_sql', { sql_text: sql })
  if (error) {
    console.log('rpc exec_sql failed (expected if not available):', error.message)
    console.log('\nPlease run the following SQL in Supabase Dashboard > SQL Editor:')
    console.log(sql)
    console.log('\n--- Attempting to insert templates anyway ---')
  } else {
    console.log('Tables created successfully!')
  }

  // Insert templates
  const templates = [
    { name: '🍽️ Рестораны/Кафе', niche: 'Рестораны/Кафе', message: 'Здравствуйте! 👋\n\nМы — Pabliki.kz, городская медиасеть Казахстана. Помогаем ресторанам и кафе привлекать гостей через рекламу в Instagram-пабликах.\n\n🔥 Что мы предлагаем:\n✅ Размещение в 700+ городских пабликах\n✅ Охват от 50 000 до 500 000 подписчиков\n✅ Нативный формат — не выглядит как реклама\n✅ Результат уже в первые дни\n\n📊 Кейс: ресторан в Алматы получил 200+ бронирований за неделю с одного размещения.\n\nХотите узнать, сколько стоит реклама для вашего заведения? Подготовим бесплатный медиаплан! 📋' },
    { name: '💇 Салоны красоты', niche: 'Салоны красоты', message: 'Здравствуйте! 👋\n\nМы — Pabliki.kz, городская медиасеть. Помогаем салонам красоты привлекать клиентов через Instagram-паблики вашего города.\n\n💅 Почему это работает:\n✅ Ваша реклама в пабликах, которые читает ваша ЦА\n✅ Нативный формат — сохраняют и пересылают\n✅ Охват от 50К до 500К подписчиков\n✅ Стоимость от 15 000₸ за размещение\n\n📊 Кейс: салон красоты в Астане — 150 новых записей за 5 дней.\n\nПодготовим бесплатную подборку пабликов для вашего города?' },
    { name: '🏥 Медицинские центры', niche: 'Медицина', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть Казахстана. Помогаем медицинским центрам привлекать пациентов через рекламу в Instagram-пабликах.\n\n🏥 Преимущества:\n✅ 700+ пабликов в 14 регионах КЗ\n✅ Аудитория 93М+ подписчиков\n✅ Нативный формат — доверие аудитории\n✅ Таргетинг по городу и категории\n\n📊 Медицинские центры получают в среднем 80-120 обращений с одной кампании.\n\nГотовы подготовить персональный медиаплан для вашей клиники!' },
    { name: '🏋️ Фитнес/Спорт', niche: 'Фитнес', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть. Помогаем фитнес-клубам и спортзалам привлекать новых клиентов.\n\n💪 Что предлагаем:\n✅ Реклама в городских Instagram-пабликах\n✅ Охват активной аудитории вашего города\n✅ Нативный формат — люди сохраняют и делятся\n✅ Идеально для акций и сезонных предложений\n\n📊 Фитнес-клуб в Караганде: +300 заявок на пробное занятие за 2 недели.\n\nХотите узнать стоимость? Подготовим медиаплан бесплатно!' },
    { name: '🎓 Образование', niche: 'Образование', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть. Помогаем образовательным центрам и школам привлекать учеников через Instagram-паблики.\n\n🎓 Почему паблики:\n✅ Мамочки и родители — основная аудитория городских пабликов\n✅ 700+ пабликов в 14 регионах\n✅ Нативный формат — высокое доверие\n✅ Отлично работает для набора на курсы и в школы\n\nПодготовим персональную подборку пабликов для вашего города?' },
    { name: '🏠 Недвижимость', niche: 'Недвижимость', message: 'Здравствуйте! 👋\n\nPabliki.kz — городская медиасеть Казахстана. Помогаем застройщикам и агентствам недвижимости привлекать покупателей.\n\n🏠 Наши возможности:\n✅ 700+ городских Instagram-пабликов\n✅ Охват 93М+ подписчиков в 14 регионах\n✅ Идеально для ЖК, квартир, коммерческой недвижимости\n✅ Формат «городская новость» — максимальное доверие\n\n📊 Застройщик в Алматы: 500+ обращений за месяц с 3 размещений.\n\nГотовы обсудить стратегию продвижения ваших объектов!' },
  ]

  const { error: tplErr } = await supabase.from('wa_templates').insert(templates)
  if (tplErr) {
    console.log('Template insert error:', tplErr.message)
    if (tplErr.message.includes('does not exist')) {
      console.log('\nTables need to be created first via SQL Editor.')
    }
  } else {
    console.log(`Inserted ${templates.length} templates!`)
  }
}

main().catch(console.error)
