#!/usr/bin/env node
/**
 * Запусти этот скрипт на своём компьютере:
 * 
 * 1. Убедись что у тебя Node.js >= 18
 * 2. cd mediamap
 * 3. npm install @supabase/supabase-js
 * 4. node scripts/upload-avatars-local.js
 * 
 * Скрипт скачает аватарки из Instagram и зальёт в Supabase Storage.
 * Занимает ~30 минут (758 аккаунтов × 2.5 сек задержка)
 */

const SUPABASE_URL = 'https://vdnmqdibjyonrbwirbdf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'

async function main() {
  // Dynamic import for ESM compatibility
  const { createClient } = require('@supabase/supabase-js')
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const sleep = ms => new Promise(r => setTimeout(r, ms))

  // Get all pabliks
  const { data, error } = await sb.from('media_resources')
    .select('id, username, metadata')
    .eq('platform', 'instagram')
    .order('subscribers', { ascending: false })

  if (error) { console.error('DB error:', error.message); return }

  console.log(`📋 Всего пабликов: ${data.length}`)

  // Check which already uploaded
  const { data: existing } = await sb.storage.from('avatars').list('', { limit: 1000 })
  const existingSet = new Set((existing || []).map(f => f.name.replace('.jpg', '')))
  
  const todo = data.filter(r => !existingSet.has(r.username))
  console.log(`✅ Уже загружено: ${existingSet.size}`)
  console.log(`📥 Осталось: ${todo.length}\n`)

  let success = 0, fail = 0

  for (let i = 0; i < todo.length; i++) {
    const r = todo[i]
    const u = r.username

    try {
      // Fetch avatar URL from Instagram
      const res = await fetch(
        `https://i.instagram.com/api/v1/users/web_profile_info/?username=${u}`,
        { headers: { 'User-Agent': 'Instagram 275.0.0.27.98 Android' } }
      )

      if (!res.ok) {
        fail++
        console.log(`❌ ${i + 1}/${todo.length} @${u} — HTTP ${res.status}`)
        await sleep(2000)
        continue
      }

      const json = await res.json()
      const picUrl = json?.data?.user?.profile_pic_url

      if (!picUrl) {
        fail++
        console.log(`❌ ${i + 1}/${todo.length} @${u} — нет аватарки`)
        await sleep(2000)
        continue
      }

      // Download image
      const imgRes = await fetch(picUrl)
      if (!imgRes.ok) {
        fail++
        console.log(`❌ ${i + 1}/${todo.length} @${u} — не скачалось`)
        await sleep(2000)
        continue
      }

      const buf = Buffer.from(await imgRes.arrayBuffer())

      // Upload to Supabase Storage
      const { error: upErr } = await sb.storage.from('avatars').upload(
        `${u}.jpg`, buf,
        { contentType: 'image/jpeg', upsert: true }
      )

      if (upErr) {
        fail++
        console.log(`❌ ${i + 1}/${todo.length} @${u} — upload: ${upErr.message}`)
      } else {
        success++
        console.log(`✅ ${i + 1}/${todo.length} @${u} (${(buf.length / 1024).toFixed(1)}KB)`)
      }
    } catch (e) {
      fail++
      console.log(`❌ ${i + 1}/${todo.length} @${u} — ${e.message}`)
    }

    await sleep(2500)
  }

  console.log(`\n🏁 Готово!`)
  console.log(`✅ Загружено: ${success}`)
  console.log(`❌ Не удалось: ${fail}`)
  console.log(`\nТеперь скажи Виктории "аватарки залиты" — она обновит UI.`)
}

main().catch(console.error)
