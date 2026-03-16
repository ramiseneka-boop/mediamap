const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = 'https://vdnmqdibjyonrbwirbdf.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ';

const supabase = createClient(SUPA_URL, SUPA_KEY);

// Category mapping: TG category → Supabase category id
const CATEGORY_MAP = {
  'Новостные': 1,    // Новости 📰
  'Бизнес': 3,       // Бизнес 💼
  'Развлечения': 2,  // Развлечения 🎭
  'Образование': 10, // Образование 📚
  'Спорт': 7,        // Спорт ⚽
  'Еда/Досуг': 39,   // Еда/Досуг 🍽
  'Авто': 5,         // Авто 🚗
  'Недвижимость': 9, // Недвижимость 🏠
  'Общие': 32,       // Общие 📱
  // Маркетинг — will be created
};

async function main() {
  // Load telegram data
  let src = fs.readFileSync(__dirname + '/../../pabliki-roadmap/telegram-data.js', 'utf8');
  src = src.replace('const TELEGRAM_DB=', 'var TELEGRAM_DB=');
  eval(src);
  console.log(`Loaded ${TELEGRAM_DB.length} channels`);

  // 1. Ensure "Казахстан" city exists (the only city not in DB)
  const { data: kazCity } = await supabase.from('cities').select('id').eq('name', 'Казахстан').single();
  let kazCityId;
  if (kazCity) {
    kazCityId = kazCity.id;
    console.log('City "Казахстан" already exists, id:', kazCityId);
  } else {
    const { data: newCity, error } = await supabase.from('cities').insert({ name: 'Казахстан' }).select('id').single();
    if (error) { console.error('Error creating Казахстан city:', error); return; }
    kazCityId = newCity.id;
    console.log('Created city "Казахстан", id:', kazCityId);
  }

  // 2. Ensure "Маркетинг" category exists
  const { data: mktCat } = await supabase.from('categories').select('id').eq('name', 'Маркетинг').single();
  let mktCatId;
  if (mktCat) {
    mktCatId = mktCat.id;
    console.log('Category "Маркетинг" already exists, id:', mktCatId);
  } else {
    const { data: newCat, error } = await supabase.from('categories').insert({ name: 'Маркетинг', icon: '📈' }).select('id').single();
    if (error) { console.error('Error creating Маркетинг category:', error); return; }
    mktCatId = newCat.id;
    console.log('Created category "Маркетинг", id:', mktCatId);
  }
  CATEGORY_MAP['Маркетинг'] = mktCatId;

  // 3. Build city name → id map
  const { data: allCities } = await supabase.from('cities').select('id, name');
  const cityMap = {};
  for (const c of allCities) cityMap[c.name] = c.id;

  // 4. Get existing telegram usernames for dedup
  const { data: existing } = await supabase.from('media_resources').select('username').eq('platform', 'telegram');
  const existingUsernames = new Set((existing || []).map(r => r.username));
  console.log(`Existing telegram resources: ${existingUsernames.size}`);

  // 5. Prepare rows
  const rows = [];
  let skipped = 0;
  for (const ch of TELEGRAM_DB) {
    if (existingUsernames.has(ch.handle)) { skipped++; continue; }
    const cityId = cityMap[ch.c] || null;
    const categoryId = CATEGORY_MAP[ch.t] || null;
    rows.push({
      platform: 'telegram',
      name: ch.name,
      username: ch.handle,
      subscribers: ch.s,
      avg_views: ch.v,
      url: ch.l,
      city_id: cityId,
      category_id: categoryId,
      is_active: true,
    });
  }
  console.log(`To insert: ${rows.length}, skipped (dedup): ${skipped}`);

  // 6. Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('media_resources').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}:`, error);
      // Try one-by-one for this batch
      for (const row of batch) {
        const { error: e2 } = await supabase.from('media_resources').insert(row);
        if (e2) console.error(`  Failed: ${row.username}:`, e2.message);
        else inserted++;
      }
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`\r  Inserted ${inserted}/${rows.length}`);
  }
  console.log('\nDone!');

  // 7. Verify
  const { count } = await supabase.from('media_resources').select('*', { count: 'exact', head: true }).eq('platform', 'telegram');
  console.log(`Total telegram resources in DB: ${count}`);
}

main().catch(console.error);
