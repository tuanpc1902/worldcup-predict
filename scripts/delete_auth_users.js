/**
 * Xoá tất cả auth users (trừ admin) qua Supabase Admin API
 * Chạy: node scripts/delete_auth_users.js
 * Cần: NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function deleteAllUsers() {
  console.log('Fetching users...')

  let page = 1
  const perPage = 1000
  const toDelete = []

  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) { console.error('listUsers error:', error); process.exit(1) }
    if (!users || users.length === 0) break

    for (const u of users) {
      // Giữ lại admin accounts (có email chứa @admin hoặc đánh dấu thủ công)
      const isAdmin = u.user_metadata?.role === 'admin'
      if (!isAdmin) toDelete.push(u.id)
    }

    if (users.length < perPage) break
    page++
  }

  console.log(`Found ${toDelete.length} non-admin users to delete.`)
  if (toDelete.length === 0) { console.log('Nothing to do.'); return }

  // Xác nhận
  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout })
  await new Promise(resolve => {
    readline.question(`⚠️  Xoá ${toDelete.length} users? Gõ "YES" để xác nhận: `, async (answer) => {
      readline.close()
      if (answer.trim() !== 'YES') { console.log('Huỷ.'); process.exit(0) }
      resolve()
    })
  })

  let deleted = 0
  let failed = 0
  for (const uid of toDelete) {
    const { error } = await supabase.auth.admin.deleteUser(uid)
    if (error) { console.error(`  FAILED ${uid}:`, error.message); failed++ }
    else { deleted++ }
    if (deleted % 50 === 0) console.log(`  Deleted ${deleted}/${toDelete.length}...`)
  }

  console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}`)
}

deleteAllUsers().catch(console.error)
