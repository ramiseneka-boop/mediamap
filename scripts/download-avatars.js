// Download Instagram avatars to public/avatars/ as permanent files
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync('.env.local','utf8');
env.split('\n').forEach(l => { const [k,...v] = l.split('='); if(k && v.length) process.env[k.trim()] = v.join('=').trim(); });

const {createClient} = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const avatarDir = path.join(__dirname, '..', 'public', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAvatar(username) {
  try {
    const res = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
      headers: { 'User-Agent': 'Instagram 275.0.0.27.98 Android' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.user?.profile_pic_url || null;
  } catch { return null; }
}

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  return true;
}

async function main() {
  const {data} = await sb.from('media_resources').select('id, username, metadata').eq('platform','instagram').order('subscribers',{ascending:false});
  
  // Filter: skip already downloaded
  const todo = data.filter(r => {
    const file = path.join(avatarDir, `${r.username}.jpg`);
    return !fs.existsSync(file);
  });
  
  console.log(`Total: ${data.length} | Already downloaded: ${data.length - todo.length} | To download: ${todo.length}`);
  
  let success = 0, fail = 0;
  for (let i = 0; i < todo.length; i++) {
    const r = todo[i];
    const u = r.username;
    const file = path.join(avatarDir, `${u}.jpg`);
    
    const url = await fetchAvatar(u);
    if (!url) {
      fail++;
      console.log(`❌ ${i+1}/${todo.length} @${u}`);
      await sleep(2000);
      continue;
    }
    
    const ok = await downloadFile(url, file);
    if (ok) {
      success++;
      console.log(`✅ ${i+1}/${todo.length} @${u}`);
    } else {
      fail++;
      console.log(`❌ ${i+1}/${todo.length} @${u} (download fail)`);
    }
    await sleep(2500);
  }
  
  console.log(`\nDone! ✅ ${success} downloaded | ❌ ${fail} failed`);
  console.log(`Total avatars in public/avatars/: ${fs.readdirSync(avatarDir).length}`);
}

main();
