const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = 'https://vdnmqdibjyonrbwirbdf.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ';
const supabase = createClient(SUPA_URL, SUPA_KEY);

// Category mapping for YouTube/TikTok categories → Supabase category IDs
const CAT_MAP = {
  'Развлечения': 2,
  'Новости': 1,
  'Еда': 4,
  'Музыка': null, // need to create
  'Спорт': 7,
  'Юмор': 12,
  'Авто': 5,
  'Технологии': 15,
  'Образование': 10,
  'Красота': 6,
  'Общие': 32,
};

async function ensureCity(name) {
  const { data } = await supabase.from('cities').select('id').eq('name', name).single();
  if (data) return data.id;
  const { data: n, error } = await supabase.from('cities').insert({ name }).select('id').single();
  if (error) { console.error('City insert error:', name, error); return null; }
  console.log(`Created city "${name}" id=${n.id}`);
  return n.id;
}

async function ensureCategory(name) {
  if (CAT_MAP[name] !== undefined && CAT_MAP[name] !== null) return CAT_MAP[name];
  // Check if exists
  const { data } = await supabase.from('categories').select('id').eq('name', name).single();
  if (data) { CAT_MAP[name] = data.id; return data.id; }
  // Create
  const icons = { 'Музыка': '🎵' };
  const { data: n, error } = await supabase.from('categories').insert({ name, icon: icons[name] || '📱' }).select('id').single();
  if (error) { console.error('Cat insert error:', name, error); return null; }
  CAT_MAP[name] = n.id;
  console.log(`Created category "${name}" id=${n.id}`);
  return n.id;
}

async function migrate(platform, dbVar, filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(`const ${dbVar}=`, `var ${dbVar}=`);
  eval(src);
  const DB = eval(dbVar);
  console.log(`\n=== ${platform.toUpperCase()} === ${DB.length} items`);

  // Delete existing for this platform
  const { error: delErr } = await supabase.from('media_resources').delete().eq('platform', platform);
  if (delErr) console.error('Delete error:', delErr);
  else console.log(`Cleared existing ${platform} entries`);

  let ok = 0, fail = 0;
  // Batch insert in groups of 20
  for (let i = 0; i < DB.length; i += 20) {
    const batch = DB.slice(i, i + 20);
    const rows = [];
    for (const item of batch) {
      const cityId = await ensureCity(item.c || 'Казахстан');
      const catId = await ensureCategory(item.t || 'Общие');
      rows.push({
        name: item.name,
        platform,
        username: item.handle,
        subscribers: item.s || 0,
        city_id: cityId,
        category_id: catId,
        is_active: true,
        cost_post: 0,
        sell_post: 0,
        cost_story: 0,
        sell_story: 0,
      });
    }
    const { error } = await supabase.from('media_resources').insert(rows);
    if (error) { console.error(`Batch ${i} error:`, error); fail += rows.length; }
    else { ok += rows.length; }
  }
  console.log(`${platform}: inserted ${ok}, failed ${fail}`);
}

async function main() {
  const base = __dirname + '/../../pabliki-roadmap';
  await migrate('youtube', 'YOUTUBE_DB', base + '/youtube-data.js');
  await migrate('tiktok', 'TIKTOK_DB', base + '/tiktok-data.js');
  console.log('\nDone!');
}

main().catch(console.error);
