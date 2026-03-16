const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const BATCH = parseInt(process.env.BATCH || '0');
const SIZE = parseInt(process.env.SIZE || '50');

(async () => {
  const { data, error } = await supabase
    .from('media_resources')
    .select('id, name, subscribers, metadata')
    .eq('platform', 'instagram')
    .order('id')
    .range(BATCH * SIZE, (BATCH + 1) * SIZE - 1);

  if (error || !data?.length) { console.log('No data or error', error); return; }
  console.log(`Batch ${BATCH}: ${data.length} pabliks`);

  let updated = 0, same = 0, fail = 0;

  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    const u = (p.metadata?.instagram_username || p.name || '').replace('@', '').toLowerCase().trim();
    if (!u) { fail++; continue; }

    try {
      process.stdout.write(`[${i+1}/${data.length}] ${u}... `);

      const json = execSync(
        `curl -s --max-time 10 -H "User-Agent: Instagram 275.0.0.27.98 Android" -H "X-IG-App-ID: 936619743392459" "https://i.instagram.com/api/v1/users/web_profile_info/?username=${u}"`,
        { timeout: 15000 }
      ).toString();

      let user;
      try { user = JSON.parse(json)?.data?.user; } catch { user = null; }
      if (!user) { console.log('✗ not found'); fail++; await sleep(2000); continue; }

      const newSubs = user.edge_followed_by?.count || 0;
      const oldSubs = p.subscribers || 0;
      const diff = newSubs - oldSubs;

      if (diff === 0) {
        console.log(`= ${newSubs}`);
        same++;
      } else {
        const sign = diff > 0 ? '+' : '';
        await supabase.from('media_resources').update({
          subscribers: newSubs,
          metadata: {
            ...p.metadata,
            subscribers_updated: new Date().toISOString(),
            posts_count: user.edge_owner_to_timeline_media?.count || null,
          }
        }).eq('id', p.id);
        console.log(`${oldSubs} → ${newSubs} (${sign}${diff})`);
        updated++;
      }
      await sleep(2500);
    } catch (e) {
      console.log(`✗ ${e.message?.slice(0, 60)}`);
      fail++;
      await sleep(3000);
    }
  }

  console.log(`\n=== Batch ${BATCH}: updated ${updated}, same ${same}, fail ${fail} ===`);
})();
