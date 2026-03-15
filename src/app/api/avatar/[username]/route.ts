import { NextRequest, NextResponse } from 'next/server'

// In-memory cache for avatar URLs (survives across requests in the same serverless instance)
const cache = new Map<string, { url: string; ts: number }>()
const CACHE_TTL = 3600_000 // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const clean = username.replace(/^@/, '').trim().toLowerCase()
  if (!clean) return new NextResponse('Missing username', { status: 400 })

  // Check cache
  const cached = cache.get(clean)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.redirect(cached.url, { status: 302 })
  }

  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${clean}`,
      {
        headers: { 'User-Agent': 'Instagram 275.0.0.27.98 Android' },
        next: { revalidate: 3600 }
      }
    )

    if (!res.ok) {
      return new NextResponse(null, { status: 404 })
    }

    const json = await res.json()
    const picUrl = json?.data?.user?.profile_pic_url

    if (!picUrl) {
      return new NextResponse(null, { status: 404 })
    }

    // Cache it
    cache.set(clean, { url: picUrl, ts: Date.now() })

    // Redirect to the actual image
    return NextResponse.redirect(picUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      }
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
