const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fetchAvatarCurl(username) {
  try {
    const json = execSync(
      `curl -s -H "User-Agent: Instagram 275.0.0.27.98 Android" -H "X-IG-App-ID: 936619743392459" "https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}"`,
      { timeout: 15000 }
    ).toString();
    const data = JSON.parse(json);
    return data?.data?.user?.profile_pic_url_hd || data?.data?.user?.profile_pic_url || null;
  } catch { return null; }
}

function downloadImageCurl(url) {
  try {
    return execSync(`curl -sL "${url}" --max-time 15`, { maxBuffer: 10*1024*1024 });
  } catch { return null; }
}

async function main() {
  const { data: pabliks, error } = await supabase
    .from('media_resources')
    .select('id, name, metadata')
    .eq('platform', 'instagram')
    .order('id');

  if (error) { console.error('DB error:', error); return; }
  console.log(`Total: ${pabliks.length}`);

  let uploaded = 0, skipped = 0, failed = 0;

  for (const p of pabliks) {
    const username = (p.metadata?.instagram_username || p.name || '').replace('@', '').toLowerCase();
    if (!username) { skipped++; continue; }

    const publicUrl = `https://vdnmqdibjyonrbwirbdf.supabase.co/storage/v1/object/public/avatars/${username}.jpg`;

    // Skip if already has permanent URL
    if (p.metadata?.avatar_url === publicUrl) { skipped++; continue; }

    try {
      process.stdout.write(`[${uploaded+failed+1}/${pabliks.length}] ${username}... `);
      const picUrl = fetchAvatarCurl(username);
      if (!picUrl) { console.log('✗ not found'); failed++; await sleep(2000); continue; }

      const imgBuf = downloadImageCurl(picUrl);
      if (!imgBuf || imgBuf.length < 500) { console.log('✗ empty'); failed++; await sleep(2000); continue; }

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(`${username}.jpg`, imgBuf, { contentType: 'image/jpeg', upsert: true });

      if (upErr) { console.log(`✗ upload: ${upErr.message}`); failed++; await sleep(2000); continue; }

      await supabase.from('media_resources').update({
        metadata: { ...p.metadata, avatar_url: publicUrl }
      }).eq('id', p.id);

      console.log(`✓ ${(imgBuf.length/1024).toFixed(0)}KB`);
      uploaded++;
      await sleep(2500);
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed++;
      await sleep(3000);
    }
  }

  console.log(`\nDone! ✓${uploaded} ⊘${skipped} ✗${failed}`);
}

main();
