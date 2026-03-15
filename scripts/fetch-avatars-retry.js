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

async function main() {
  const {data} = await sb.from('media_resources').select('id, name, metadata');
  const missing = data.filter(d => !d.metadata?.avatar_url);
  console.log(`Retrying ${missing.length} pabliks without avatars...`);
  
  let success = 0, fail = 0;
  for (let i = 0; i < missing.length; i++) {
    const r = missing[i];
    const username = r.metadata?.instagram || r.name;
    const url = await fetchAvatar(username);
    
    if (url) {
      const newMeta = { ...r.metadata, avatar_url: url };
      await sb.from('media_resources').update({ metadata: newMeta }).eq('id', r.id);
      success++;
      console.log(`✅ ${i+1}/${missing.length} @${username}`);
    } else {
      fail++;
      console.log(`❌ ${i+1}/${missing.length} @${username} — not found`);
    }
    await sleep(3000); // 3s delay for retry
  }
  console.log(`\nDone! ✅ ${success} new | ❌ ${fail} still missing`);
}

main();
