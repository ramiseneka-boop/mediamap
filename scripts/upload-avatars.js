const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchAvatar(username) {
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100)',
      'X-IG-App-ID': '936619743392459',
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.user?.profile_pic_url_hd || data?.data?.user?.profile_pic_url || null;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  // Get all pabliks with instagram_username
  const { data: pabliks, error } = await supabase
    .from('media_resources')
    .select('id, name, metadata')
    .eq('platform', 'instagram')
    .order('id');

  if (error) { console.error('DB error:', error); return; }
  console.log(`Total pabliks: ${pabliks.length}`);

  let uploaded = 0, skipped = 0, failed = 0;

  for (const p of pabliks) {
    const username = (p.metadata?.instagram_username || p.name || '').replace('@', '').toLowerCase();
    if (!username) { skipped++; continue; }

    // Check if already uploaded
    const { data: existing } = await supabase.storage.from('avatars').list('', { search: `${username}.jpg` });
    if (existing?.some(f => f.name === `${username}.jpg`)) {
      // Already in storage, just update URL in DB if needed
      const publicUrl = `https://vdnmqdibjyonrbwirbdf.supabase.co/storage/v1/object/public/avatars/${username}.jpg`;
      if (p.metadata?.avatar_url !== publicUrl) {
        await supabase.from('media_resources').update({
          metadata: { ...p.metadata, avatar_url: publicUrl }
        }).eq('id', p.id);
      }
      skipped++;
      continue;
    }

    try {
      console.log(`[${uploaded + failed + 1}] Fetching ${username}...`);
      const picUrl = await fetchAvatar(username);
      if (!picUrl) { console.log(`  ✗ No profile found`); failed++; await sleep(2000); continue; }

      const imgBuf = await downloadImage(picUrl);
      if (!imgBuf || imgBuf.length < 500) { console.log(`  ✗ Empty image`); failed++; await sleep(2000); continue; }

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(`${username}.jpg`, imgBuf, { contentType: 'image/jpeg', upsert: true });

      if (upErr) { console.log(`  ✗ Upload error: ${upErr.message}`); failed++; await sleep(2000); continue; }

      const publicUrl = `https://vdnmqdibjyonrbwirbdf.supabase.co/storage/v1/object/public/avatars/${username}.jpg`;
      await supabase.from('media_resources').update({
        metadata: { ...p.metadata, avatar_url: publicUrl }
      }).eq('id', p.id);

      console.log(`  ✓ Uploaded (${(imgBuf.length/1024).toFixed(1)}KB)`);
      uploaded++;
      await sleep(2500);
    } catch (e) {
      console.log(`  ✗ Error: ${e.message}`);
      failed++;
      await sleep(3000);
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

main();
