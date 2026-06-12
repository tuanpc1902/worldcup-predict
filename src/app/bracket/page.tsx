import { createServerSupabase } from '@/lib/supabase-server'
import type { Match } from '@/types'
import { getFlagUrl } from '@/lib/flag-map'

export const dynamic = 'force-dynamic'

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final']
const ROUND_LABELS: Record<string, string> = {
  round_of_32: 'Vòng 1/16',
  round_of_16: 'Vòng 1/8',
  quarter: 'Tứ kết',
  semi: 'Bán kết',
  final: 'Chung kết',
}

function TeamSlot({ name, score, isWinner }: { name: string; score: number | null; isWinner?: boolean }) {
  const flag = name ? getFlagUrl(name, 40) : null
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${isWinner ? 'bg-green-50' : 'bg-white'}`}>
      {flag
        ? <img src={flag} alt={name} className="w-6 h-4 object-cover rounded shadow-sm flex-shrink-0" />
        : <div className="w-6 h-4 bg-slate-100 rounded flex-shrink-0" />
      }
      <span className={`text-sm flex-1 truncate ${isWinner ? 'font-bold text-green-700' : name ? 'text-slate-700' : 'text-slate-300 italic'}`}>
        {name || 'TBD'}
      </span>
      {score !== null && (
        <span className={`text-sm font-bold tabular-nums ml-1 ${isWinner ? 'text-green-700' : 'text-slate-500'}`}>{score}</span>
      )}
    </div>
  )
}

function MatchSlot({ match }: { match?: Match }) {
  if (!match) return (
    <div className="border border-slate-200 rounded-lg overflow-hidden w-52 bg-slate-50 opacity-50">
      <div className="flex items-center gap-2 px-3 py-2"><div className="w-6 h-4 bg-slate-100 rounded" /><span className="text-sm text-slate-300">TBD</span></div>
      <div className="h-px bg-slate-100" />
      <div className="flex items-center gap-2 px-3 py-2"><div className="w-6 h-4 bg-slate-100 rounded" /><span className="text-sm text-slate-300">TBD</span></div>
    </div>
  )

  const homeWin = match.status === 'finished' && match.home_score! > match.away_score!
  const awayWin = match.status === 'finished' && match.away_score! > match.home_score!

  return (
    <div className={`border rounded-lg overflow-hidden w-52 shadow-sm ${
      match.status === 'live' ? 'border-red-400 ring-1 ring-red-300' :
      match.status === 'finished' ? 'border-slate-200' : 'border-slate-200'
    }`}>
      {match.status === 'live' && (
        <div className="bg-red-500 text-white text-xs text-center py-0.5 font-semibold flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </div>
      )}
      <TeamSlot name={match.home_team} score={match.home_score} isWinner={homeWin} />
      <div className="h-px bg-slate-100" />
      <TeamSlot name={match.away_team} score={match.away_score} isWinner={awayWin} />
    </div>
  )
}

export default async function BracketPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('matches')
    .select('*')
    .in('stage', ROUND_ORDER)
    .order('match_time', { ascending: true })

  const matches = (data ?? []) as Match[]
  const byRound: Record<string, Match[]> = {}
  ROUND_ORDER.forEach(r => { byRound[r] = matches.filter(m => m.stage === r) })

  const hasKnockout = matches.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏟️ Bracket thi đấu</h1>
        <p className="text-slate-500 text-sm mt-1">Lịch thi đấu vòng loại trực tiếp</p>
      </div>

      {!hasKnockout ? (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="text-slate-600 font-medium">Chưa có vòng loại trực tiếp</p>
          <p className="text-slate-400 text-sm mt-1">Bracket sẽ hiển thị sau khi vòng bảng kết thúc (11/7)</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-8 min-w-max items-start">
            {ROUND_ORDER.filter(r => byRound[r].length > 0).map(round => (
              <div key={round} className="flex flex-col gap-3">
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                    {ROUND_LABELS[round]}
                  </span>
                  <div className="text-xs text-slate-400 mt-1">{byRound[round].length} trận</div>
                </div>
                <div className={`flex flex-col ${round === 'final' ? 'justify-center' : 'gap-3'}`}
                  style={{ gap: round === 'semi' ? '2rem' : round === 'quarter' ? '1rem' : '0.75rem' }}>
                  {byRound[round].map(m => <MatchSlot key={m.id} match={m} />)}
                </div>
              </div>
            ))}

            {/* Champion display */}
            {byRound['final']?.some(m => m.status === 'finished') && (() => {
              const final = byRound['final'][0]
              const champion = final.home_score! > final.away_score! ? final.home_team : final.away_team
              const flag = getFlagUrl(champion)
              return (
                <div className="flex flex-col items-center justify-center gap-3 px-6">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full">
                    🏆 Vô địch
                  </span>
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex flex-col items-center gap-2 w-44">
                    {flag && <img src={flag} alt={champion} className="w-16 h-11 object-cover rounded shadow" />}
                    <span className="font-bold text-amber-800 text-center">{champion}</span>
                    <span className="text-2xl">🏆</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Group stage summary */}
      {byRound['round_of_32']?.length === 0 && matches.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-600 mb-3">Trạng thái vòng bảng</h2>
          <p className="text-slate-400 text-sm">Vòng bảng đang diễn ra — bracket sẽ tự động cập nhật khi có kết quả.</p>
        </div>
      )}
    </div>
  )
}
