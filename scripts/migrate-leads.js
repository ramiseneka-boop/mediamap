const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
);

const raw = fs.readFileSync(path.join(__dirname, '../../pabliki-roadmap/leads-data.js'), 'utf8');
const match = raw.match(/const DEFAULT_LEADS=(\[[\s\S]*?\]);/);
if (!match) { console.error('Cannot parse'); process.exit(1); }
const leads = JSON.parse(match[1]);

async function migrate() {
  const { data: cities } = await supabase.from('cities').select('*');
  const cityMap = {};
  cities.forEach(c => cityMap[c.name] = c.id);

  const clients = leads.map(l => ({
    company_name: l.name || 'Unknown',
    contact_name: l.contact || '',
    phone: l.phone ? '+' + l.phone : '',
    niche: l.niche || '',
    status: 'new',
    source: '2gis',
    city_id: cityMap[l.city] || null,
    metadata: { whatsapp: l.whatsapp, role: l.role, original_status: l.status, source: 'pwa_migration' }
  }));

  let inserted = 0;
  for (let i = 0; i < clients.length; i += 50) {
    const batch = clients.slice(i, i + 50);
    const { data, error } = await supabase.from('clients').insert(batch).select('id');
    if (error) {
      console.error(`Batch ${i} error:`, error.message);
    } else {
      inserted += data.length;
      console.log(`Inserted ${inserted}/${clients.length}`);
    }
  }
  console.log(`\nDone! Migrated ${inserted} clients.`);
}

migrate().catch(console.error);
