const fs = require('fs');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Load env
const env = fs.readFileSync('.env.local','utf8');
env.split('\n').forEach(l => { const [k,...v] = l.split('='); if(k && v.length) process.env[k.trim()] = v.join('=').trim(); });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fetchAvatar(username) {
  try {
    const result = execSync(
      `curl -s -m 10 -H "User-Agent: Instagram 275.0.0.27.98 Android" "https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}"`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const json = JSON.parse(result);
    return json?.data?.user?.profile_pic_url || null;
  } catch (e) {
    return null;
  }
}

async function main() {
  const { data: resources, error } = await supabase
    .from('media_resources')
    .select('id, username, metadata')
    .eq('platform', 'instagram')
    .order('subscribers', { ascending: false });

  if (error) { console.error('❌ Failed to load resources:', error); process.exit(1); }
  
  console.log(`📋 Loaded ${resources.length} pabliks`);
  
  const todo = resources.filter(r => !r.metadata?.avatar_url);
  console.log(`🔄 Need to fetch ${todo.length} avatars (${resources.length - todo.length} already done)`);

  let success = 0, failed = 0;

  for (let i = 0; i < todo.length; i++) {
    const r = todo[i];
    const username = r.username;
    
    const avatarUrl = fetchAvatar(username);
    
    if (!avatarUrl) {
      console.warn(`⚠️ ${i+1}/${todo.length} @${username} - failed`);
      failed++;
      await sleep(3000);
      continue;
    }
    
    const newMetadata = { ...(r.metadata || {}), avatar_url: avatarUrl };
    
    const { error: updateErr } = await supabase
      .from('media_resources')
      .update({ metadata: newMetadata })
      .eq('id', r.id);
    
    if (updateErr) {
      console.warn(`⚠️ ${i+1}/${todo.length} @${username} - DB error: ${updateErr.message}`);
      failed++;
    } else {
      success++;
      console.log(`✅ ${i+1}/${todo.length} @${username} - got avatar`);
    }
    
    await sleep(2000);
  }
  
  console.log(`\n🏁 Done! ✅ ${success} success, ⚠️ ${failed} failed, ⏭ ${resources.length - todo.length} skipped`);
}

main().catch(console.error);
