const { createClient } = require('@supabase/supabase-js');
try { require('dotenv').config({ path: '.env.local' }); } catch(e) {
  // Load manually
  const fs = require('fs');
  const env = fs.readFileSync('.env.local','utf8');
  env.split('\n').forEach(l => { const [k,...v] = l.split('='); if(k && v.length) process.env[k.trim()] = v.join('=').trim(); });
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Use service role key or anon key
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CATEGORIES = [
  { name: 'Общие', icon: '📱' },
  { name: 'Новостные', icon: '📰' },
  { name: 'Реклама/Торговля', icon: '🛒' },
  { name: 'Вакансии', icon: '💼' },
  { name: 'Городские', icon: '🏙' },
  { name: 'Мамочки', icon: '👩‍👧' },
  { name: 'Авто/Недвижимость', icon: '🚗' },
  { name: 'Еда/Досуг', icon: '🍽' },
];

(async () => {
  // 1. Insert categories
  console.log('Creating categories...');
  for (const cat of CATEGORIES) {
    const { data, error } = await sb.from('categories').upsert(
      { name: cat.name, icon: cat.icon },
      { onConflict: 'name' }
    ).select();
    if (error) {
      console.log(`  ⚠️ ${cat.name}: ${error.message} — trying insert`);
      const { data: d2, error: e2 } = await sb.from('categories').insert({ name: cat.name, icon: cat.icon }).select();
      if (e2) console.log(`  ❌ ${cat.name}: ${e2.message}`);
      else console.log(`  ✅ ${cat.name} id=${d2[0].id}`);
    } else {
      console.log(`  ✅ ${cat.name} id=${data?.[0]?.id}`);
    }
  }

  // 2. Get category ID map
  const { data: cats } = await sb.from('categories').select('id, name');
  if (!cats || cats.length === 0) {
    console.log('❌ No categories found! Check RLS policies.');
    return;
  }
  const catMap = {};
  cats.forEach(c => { catMap[c.name] = c.id; });
  console.log('\nCategory map:', catMap);

  // 3. Get all instagram pabliks
  const { data: pabliks, error: pErr } = await sb.from('media_resources')
    .select('id, metadata')
    .eq('platform', 'instagram');
  
  if (pErr) { console.log('❌ Error:', pErr.message); return; }
  console.log(`\nFound ${pabliks.length} pabliks to update`);

  // 4. Update each with correct category_id
  let updated = 0, skipped = 0;
  const batches = [];
  let batch = [];
  
  for (const p of pabliks) {
    const origCat = p.metadata?.original_category;
    const catId = catMap[origCat];
    if (!catId) {
      // Default to 'Общие'
      batch.push({ id: p.id, category_id: catMap['Общие'] });
    } else {
      batch.push({ id: p.id, category_id: catId });
    }
    if (batch.length >= 50) {
      batches.push(batch);
      batch = [];
    }
  }
  if (batch.length) batches.push(batch);

  for (const b of batches) {
    for (const item of b) {
      const { error } = await sb.from('media_resources')
        .update({ category_id: item.category_id })
        .eq('id', item.id);
      if (error) { console.log(`  ❌ id=${item.id}: ${error.message}`); skipped++; }
      else updated++;
    }
    process.stdout.write(`  Updated ${updated}/${pabliks.length}\r`);
  }

  console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);
  
  // 5. Verify
  const { data: verify } = await sb.from('media_resources')
    .select('category:categories(name)')
    .eq('platform', 'instagram')
    .not('category_id', 'is', null);
  console.log(`Verification: ${verify?.length} pabliks now have categories`);
})();
