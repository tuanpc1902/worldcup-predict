import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// OG image generator for match pages and prediction results
// Usage:
//   /api/og?home=Brazil&away=Argentina&hs=2&as=1         → match score card
//   /api/og?home=Brazil&away=Argentina&ph=2&pa=0&pts=8   → prediction result card

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const home   = searchParams.get('home') ?? 'Home'
  const away   = searchParams.get('away') ?? 'Away'
  const hs     = searchParams.get('hs')  // home score
  const as_    = searchParams.get('as')  // away score
  const ph     = searchParams.get('ph')  // predicted home
  const pa     = searchParams.get('pa')  // predicted away
  const pts    = searchParams.get('pts') // points earned
  const user   = searchParams.get('user') ?? ''

  const hasScore = hs !== null && as_ !== null
  const hasPred  = ph !== null && pa !== null
  const ptsNum   = pts !== null ? parseInt(pts) : null

  function ptsLabel(p: number): string {
    if (p >= 8) return '🔥 Đúng tỉ số + KQ'
    if (p >= 5) return '🎯 Đúng tỉ số'
    if (p === 3) return '✅ Đúng kết quả'
    return '❌ Chưa đúng'
  }

  const ptsColor = ptsNum === null ? '#64748b'
    : ptsNum >= 5 ? '#16a34a'
    : ptsNum === 3 ? '#2563eb'
    : ptsNum > 0 ? '#d97706'
    : '#dc2626'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #003366 0%, #001f3f 100%)',
          padding: '48px',
          fontFamily: 'sans-serif',
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: '#F97316', borderRadius: 8, padding: '4px 12px',
            color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: 2,
          }}>
            WC-88
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>World Cup 2026 Predictor</span>
        </div>

        {/* Match */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          {/* Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1 }}>
            <span style={{ color: 'white', fontSize: 28, fontWeight: 800, textAlign: 'center' }}>{home}</span>
          </div>

          {/* Score / VS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {hasScore ? (
              <div style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 32px',
                color: 'white', fontSize: 56, fontWeight: 900, letterSpacing: 4,
              }}>
                {hs}–{as_}
              </div>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 40, fontWeight: 700 }}>VS</div>
            )}
          </div>

          {/* Away */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1 }}>
            <span style={{ color: 'white', fontSize: 28, fontWeight: 800, textAlign: 'center' }}>{away}</span>
          </div>
        </div>

        {/* Prediction result */}
        {hasPred && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 32px',
          }}>
            {user && (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{user} đã dự đoán</span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 700 }}>
              {home} {ph}–{pa} {away}
            </span>
            {ptsNum !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: ptsColor, fontSize: 18, fontWeight: 800 }}>{ptsLabel(ptsNum)}</span>
                <span style={{
                  background: ptsColor, color: 'white', borderRadius: 8,
                  padding: '2px 10px', fontWeight: 900, fontSize: 16,
                }}>
                  {ptsNum > 0 ? '+' : ''}{ptsNum} pts
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
          worldcup-bet.vercel.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
