// Migrate pabliki data from PWA to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
);

// Load pabliki data
const dataFile = path.join(__dirname, '../../pabliki-roadmap/pabliki-data.js');
const raw = fs.readFileSync(dataFile, 'utf8');

// Extract PABLIKI_DB array
const match = raw.match(/const PABLIKI_DB=(\[[\s\S]*?\]);/);
if (!match) { console.error('Cannot parse PABLIKI_DB'); process.exit(1); }
const pabliki = JSON.parse(match[1]);

// Category mapping
const catMap = {
  'Общие': 'Развлечения',
  'Новостные': 'Новости',
  'Реклама/Торговля': 'Бизнес',
  'Вакансии': 'Бизнес',
  'Городские': 'Новости',
  'Мамочки': 'Мамы и дети',
  'Авто/Недвижимость': 'Недвижимость',
  'Еда/Досуг': 'Еда',
};

async function migrate() {
  // Get cities and categories from DB
  const { data: cities } = await supabase.from('cities').select('*');
  const { data: categories } = await supabase.from('categories').select('*');

  const cityMap = {};
  cities.forEach(c => cityMap[c.name] = c.id);

  const catIdMap = {};
  categories.forEach(c => catIdMap[c.name] = c.id);

  // Add missing cities
  const allCities = [...new Set(pabliki.map(p => p.c))];
  for (const cityName of allCities) {
    if (!cityMap[cityName]) {
      const { data, error } = await supabase.from('cities').insert({ name: cityName, region: cityName }).select();
      if (data && data[0]) {
        cityMap[cityName] = data[0].id;
        console.log(`Added city: ${cityName}`);
      } else if (error) {
        // might be unique constraint, try to fetch
        const { data: existing } = await supabase.from('cities').select('*').eq('name', cityName);
        if (existing && existing[0]) cityMap[cityName] = existing[0].id;
      }
    }
  }

  // Prepare media resources
  const resources = pabliki.map(p => {
    const url = p.l && p.l.startsWith('http') ? p.l : `https://www.instagram.com/${p.ig}/`;
    const mappedCat = catMap[p.t] || 'Развлечения';

    return {
      name: p.ig,
      platform: 'instagram',
      city_id: cityMap[p.c] || null,
      category_id: catIdMap[mappedCat] || null,
      url: url,
      username: p.ig,
      subscribers: p.s || 0,
      cost_post: p.co || 0,
      sell_post: p.p || 0,
      cost_story: Math.round((p.co || 0) * 0.6),  // estimate story cost
      sell_story: Math.round((p.p || 0) * 0.6),
      is_active: true,
      metadata: { original_category: p.t, source: 'pwa_migration' }
    };
  });

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < resources.length; i += 50) {
    const batch = resources.slice(i, i + 50);
    const { data, error } = await supabase.from('media_resources').insert(batch).select('id');
    if (error) {
      console.error(`Batch ${i} error:`, error.message);
    } else {
      inserted += data.length;
      console.log(`Inserted ${inserted}/${resources.length}`);
    }
  }

  console.log(`\nDone! Migrated ${inserted} media resources.`);
}

migrate().catch(console.error);
