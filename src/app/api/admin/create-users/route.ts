import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase, createServerSupabase } from '@/lib/supabase-server'

// Password chars: no ambiguous 0/O, 1/l/I
const PWD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generatePassword(len = 10): string {
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf).map(b => PWD_CHARS[b % PWD_CHARS.length]).join('')
}

// "Nguyễn Văn A" → "nguyenVanA" or slug for email
function nameToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
}

export async function POST(req: NextRequest) {
  // Verify caller is admin
  const supabaseUser = await createServerSupabase()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseUser
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ message: 'Chỉ admin mới có quyền tạo tài khoản hàng loạt' }, { status: 403 })
  }

  const { names, email_domain = 'wc.88' } = await req.json() as {
    names: string[]
    email_domain?: string
  }

  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ message: 'Danh sách tên trống' }, { status: 400 })
  }
  if (names.length > 200) {
    return NextResponse.json({ message: 'Tối đa 200 người mỗi lần' }, { status: 400 })
  }

  const supabase = createServiceSupabase()
  const results: Array<{
    name: string
    email: string
    password: string
    status: 'created' | 'error'
    error?: string
  }> = []

  // Check existing emails to handle duplicates
  const { data: existingProfiles } = await supabase
    .from('profiles').select('id')

  const usedSlugs = new Set<string>()

  for (const rawName of names) {
    const name = rawName.trim()
    if (!name) continue

    const baseSlug = nameToSlug(name) || `user${Date.now()}`

    // Ensure unique slug within this batch
    let slug = baseSlug
    let suffix = 2
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}${suffix++}`
    }
    usedSlugs.add(slug)

    const email = `${slug}@${email_domain}`
    const password = generatePassword()

    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: name },
      email_confirm: true,
    })

    if (error) {
      // If email already exists, try with suffix
      if (error.message.includes('already') || error.message.includes('exists')) {
        const slug2 = `${slug}${suffix}`
        const email2 = `${slug2}@${email_domain}`
        usedSlugs.add(slug2)
        const { error: err2 } = await supabase.auth.admin.createUser({
          email: email2,
          password,
          user_metadata: { full_name: name },
          email_confirm: true,
        })
        results.push(err2
          ? { name, email: email2, password, status: 'error', error: err2.message }
          : { name, email: email2, password, status: 'created' }
        )
      } else {
        results.push({ name, email, password, status: 'error', error: error.message })
      }
    } else {
      results.push({ name, email, password, status: 'created' })
    }
  }

  const created = results.filter(r => r.status === 'created').length
  const failed = results.filter(r => r.status === 'error').length

  return NextResponse.json({ created, failed, results })
}
