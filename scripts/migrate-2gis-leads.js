const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  'https://vdnmqdibjyonrbwirbdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1xZGlianlvbnJid2lyYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzAwMjUsImV4cCI6MjA4OTE0NjAyNX0.lmuiOsGw4b90hs7Me7NsZEbwA4cDUnIKIbanrnB_akQ'
)

async function main() {
  // Load leads
  const leads = JSON.parse(fs.readFileSync('/home/openclaw/.openclaw/workspace/pabliki/leads-2gis-almaty.json', 'utf8'))
  console.log(`Loaded ${leads.length} leads`)

  // Get cities for lookup
  const { data: cities } = await supabase.from('cities').select('id, name')
  const cityMap = {}
  if (cities) cities.forEach(c => { cityMap[c.name] = c.id })
  console.log('Cities:', Object.keys(cityMap).join(', '))

  // Get existing phones for dedup
  const { data: existing, error: fetchErr } = await supabase.from('clients').select('phone')
  if (fetchErr) { console.error('Error fetching existing:', fetchErr); return }
  const existingPhones = new Set((existing || []).map(c => c.phone).filter(Boolean))
  console.log(`Existing clients: ${existingPhones.size}`)

  // Format phone
  function formatPhone(phone) {
    if (!phone) return null
    let p = phone.replace(/[^0-9+]/g, '')
    if (p.startsWith('8') && p.length === 11) p = '+7' + p.slice(1)
    if (p.startsWith('7') && !p.startsWith('+')) p = '+' + p
    if (!p.startsWith('+')) p = '+' + p
    return p
  }

  // Filter and map
  let skipped = 0, inserted = 0, errors = 0
  const batch = []

  for (const lead of leads) {
    const phone = formatPhone(lead.phone)
    if (!phone) { skipped++; continue }
    if (existingPhones.has(phone)) { skipped++; continue }
    existingPhones.add(phone) // prevent dupes within batch

    const cityId = cityMap[lead.city] || null

    batch.push({
      company_name: lead.name || null,
      phone,
      niche: lead.niche || null,
      source: '2gis',
      city_id: cityId,
      instagram: lead.instagram || null,
      email: lead.email || null,
      website: lead.website || null,
      metadata: {
        address: lead.address,
        rubrics: lead.rubrics,
        whatsapp: lead.whatsapp,
        phones_all: lead.phones_all,
        parsed_at: lead.parsed_at
      }
    })
  }

  console.log(`To insert: ${batch.length}, skipped: ${skipped}`)

  // Insert in chunks of 500
  const chunkSize = 500
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize)
    const { error } = await supabase.from('clients').insert(chunk)
    if (error) {
      console.error(`Error inserting chunk ${i}:`, error.message)
      errors += chunk.length
    } else {
      inserted += chunk.length
      console.log(`Inserted ${inserted}/${batch.length}`)
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`)
}

main().catch(console.error)
