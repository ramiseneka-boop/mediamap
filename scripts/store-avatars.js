// Fetch Instagram avatars and store them in Supabase Storage
const fs = require('fs');
const env = fs.readFileSync('.env.local','utf8');
env.split('\n').forEach(l => { const [k,...v] = l.split('='); if(k && v.length) process.env[k.trim()] = v.join('=').trim(); });

const {createClient} = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAvatar(username) {
  const clean = username.replace(/^@/, '').trim();
  if (!clean) return null;
  try {
    const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${clean}`, {
      headers: { 'User-Agent': 'Instagram 275.0.0.27.98 Android' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.user?.profile_pic_url || null;
  } catch { return null; }
}

async function downloadAndUpload(username, url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `avatars/${username}.jpg`;
    
    const { error } = await sb.storage.from('media').upload(path, buf, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) { console.log('  upload err:', error.message); return null; }
    
    const { data } = sb.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  } catch(e) { return null; }
}

async function main() {
  // Ensure bucket exists
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'media')) {
    const { error } = await sb.storage.createBucket('media', { public: true });
    if (error) console.log('Bucket error:', error.message);
    else console.log('Created media bucket');
  }

  const {data} = await sb.from('media_resources').select('id, username, metadata').eq('platform','instagram').order('subscribers',{ascending:false});
  console.log(`Processing ${data.length} pabliks...`);
  
  let success = 0, skip = 0, fail = 0;
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const u = r.username;
    
    // Skip if already has permanent URL (supabase storage)
    if (r.metadata?.avatar_permanent) {
      skip++;
      continue;
    }
    
    // Fetch fresh avatar URL from Instagram
    const igUrl = await fetchAvatar(u);
    if (!igUrl) {
      fail++;
      console.log(`❌ ${i+1}/${data.length} @${u} — not found on IG`);
      await sleep(2000);
      continue;
    }
    
    // Download and upload to Supabase Storage
    const permUrl = await downloadAndUpload(u, igUrl);
    if (!permUrl) {
      fail++;
      console.log(`❌ ${i+1}/${data.length} @${u} — upload failed`);
      await sleep(2000);
      continue;
    }
    
    // Update metadata
    const newMeta = { ...r.metadata, avatar_url: permUrl, avatar_permanent: true };
    await sb.from('media_resources').update({ metadata: newMeta }).eq('id', r.id);
    success++;
    console.log(`✅ ${i+1}/${data.length} @${u}`);
    await sleep(2500);
  }
  console.log(`\nDone! ✅ ${success} uploaded | ⏭ ${skip} already done | ❌ ${fail} failed`);
}

main();
