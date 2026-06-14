import { NextRequest, NextResponse } from 'next/server'

// Cache flag images from flagcdn.com with long TTL.
// Browser + CDN (Vercel Edge) will cache for 1 year after first fetch.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const size = req.nextUrl.searchParams.get('w') ?? '80'

  // Validate: only allow known sizes and safe code format (letters, digits, hyphens)
  if (!['40', '80'].includes(size) || !/^[a-z0-9-]{2,10}$/.test(code)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const upstream = `https://flagcdn.com/w${size}/${code}.png`

  try {
    const res = await fetch(upstream, {
      // Next.js fetch cache: revalidate after 7 days server-side
      next: { revalidate: 604800 },
    })

    if (!res.ok) return new NextResponse('Not found', { status: 404 })

    const body = await res.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // Browser caches for 1 year; CDN edge caches for 7 days (s-maxage)
        'Cache-Control': 'public, max-age=31536000, s-maxage=604800, stale-while-revalidate=86400',
        'Vary': 'Accept-Encoding',
      },
    })
  } catch {
    return new NextResponse('Error fetching flag', { status: 502 })
  }
}
