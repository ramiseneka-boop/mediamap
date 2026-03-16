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
    .select('id, name, metadata')
    .eq('platform', 'instagram')
    .order('id')
    .range(BATCH * SIZE, (BATCH + 1) * SIZE - 1);

  if (error || !data?.length) { console.log('No data or error', error); return; }
  console.log(`Batch ${BATCH}: ${data.length} pabliks (offset ${BATCH*SIZE})`);

  let ok = 0, fail = 0, skip = 0;

  for (let i = 0; i < data.length; i++) {
    const p = data[i];
    const u = (p.metadata?.instagram_username || p.name || '').replace('@','').toLowerCase().trim();
    if (!u) { skip++; continue; }

    const permUrl = `https://vdnmqdibjyonrbwirbdf.supabase.co/storage/v1/object/public/avatars/${u}.jpg`;
    if (p.metadata?.avatar_url === permUrl) { skip++; continue; }

    try {
      process.stdout.write(`[${i+1}/${data.length}] ${u}... `);

      const json = execSync(
        `curl -s --max-time 10 -H "User-Agent: Instagram 275.0.0.27.98 Android" -H "X-IG-App-ID: 936619743392459" "https://i.instagram.com/api/v1/users/web_profile_info/?username=${u}"`,
        { timeout: 15000 }
      ).toString();

      let pic;
      try {
        const d = JSON.parse(json);
        pic = d?.data?.user?.profile_pic_url_hd || d?.data?.user?.profile_pic_url;
      } catch { pic = null; }

      if (!pic) { console.log('✗ not found'); fail++; await sleep(2000); continue; }

      const img = execSync(`curl -sL --max-time 10 "${pic}"`, { maxBuffer: 5*1024*1024, timeout: 15000 });
      if (!img || img.length < 500) { console.log('✗ tiny'); fail++; await sleep(2000); continue; }

      const { error: ue } = await supabase.storage.from('avatars').upload(`${u}.jpg`, img, { contentType: 'image/jpeg', upsert: true });
      if (ue) { console.log(`✗ upload: ${ue.message}`); fail++; await sleep(1500); continue; }

      await supabase.from('media_resources').update({
        metadata: { ...p.metadata, avatar_url: permUrl }
      }).eq('id', p.id);

      console.log(`✓ ${(img.length/1024).toFixed(0)}KB`);
      ok++;
      await sleep(2500);
    } catch (e) {
      console.log(`✗ ${e.message?.slice(0,60)}`);
      fail++;
      await sleep(3000);
    }
  }

  console.log(`\n=== Batch ${BATCH} done: ✓${ok} ⊘${skip} ✗${fail} ===`);
})();
