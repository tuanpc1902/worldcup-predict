'use client'
import { useMemo, useState } from 'react'
import FlagImg from '@/components/FlagImg'
import { teamHref } from '@/lib/time'
import type { Match, TopScorer } from '@/types'

interface Standing {
  team: string
  flag: string | null
  mp: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  pts: number
}

function computeStandings(matches: Match[]): Record<string, Standing[]> {
  const groups: Record<string, Record<string, Standing>> = {}

  for (const m of matches) {
    if (!m.group_name) continue
    if (!groups[m.group_name]) groups[m.group_name] = {}
    const g = groups[m.group_name]
    if (!g[m.home_team]) g[m.home_team] = { team: m.home_team, flag: m.home_flag, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    if (!g[m.away_team]) g[m.away_team] = { team: m.away_team, flag: m.away_flag, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }

    if (m.status !== 'finished' || m.home_score === null || m.away_score === null) continue

    const home = g[m.home_team]
    const away = g[m.away_team]
    const hs = m.home_score, as_ = m.away_score

    home.mp++; away.mp++
    home.gf += hs; home.ga += as_; home.gd = home.gf - home.ga
    away.gf += as_; away.ga += hs; away.gd = away.gf - away.ga

    if (hs > as_) { home.w++; home.pts += 3; away.l++ }
    else if (hs < as_) { away.w++; away.pts += 3; home.l++ }
    else { home.d++; away.d++; home.pts++; away.pts++ }
  }

  const sorted: Record<string, Standing[]> = {}
  for (const [name, teams] of Object.entries(groups)) {
    sorted[name] = Object.values(teams).sort((a, b) =>
      b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
    )
  }
  return sorted
}

interface Props {
  matches: Match[]
  topScorers: TopScorer[]
}

export default function StandingsClient({ matches, topScorers }: Props) {
  const [activeTab, setActiveTab] = useState<'standings' | 'scorers'>('standings')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const standings = useMemo(() => computeStandings(matches), [matches])
  const groupNames = Object.keys(standings).sort()
  const hasData = groupNames.length > 0
  const finishedCount = matches.filter(m => m.status === 'finished').length

  async function syncGoals() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/sync-goals', { method: 'POST' })
      const json = await res.json()
      setSyncMsg(json.message ?? 'Xong!')
    } catch {
      setSyncMsg('Lỗi khi sync')
    }
    setSyncing(false)
  }

  const tabs = [
    { id: 'standings', label: 'Bảng đấu' },
    { id: 'scorers', label: `Ghi bàn${topScorers.length > 0 ? ` · ${topScorers.length} CĐ` : ''}` },
  ] as const

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảng xếp hạng</h1>
          <p className="text-slate-500 text-sm mt-1">
            Vòng bảng · {finishedCount}/{matches.length} trận đã hoàn thành
          </p>
        </div>
        {/* Admin: sync goals button */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={syncGoals}
            disabled={syncing}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Đang sync...' : 'Sync goals'}
          </button>
          {syncMsg && <p className="text-xs text-slate-400">{syncMsg}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hasData && (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-slate-500">Chưa có dữ liệu vòng bảng.</p>
        </div>
      )}

      {/* ── GROUP STANDINGS ── */}
      {hasData && activeTab === 'standings' && (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            {groupNames.map(groupName => {
              const rows = standings[groupName]
              return (
                <div key={groupName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-700 text-sm">{groupName}</h2>
                    <span className="text-xs text-slate-400">
                      {rows.reduce((s, r) => s + r.mp, 0) / 2 > 0
                        ? `${rows.reduce((s, r) => s + r.mp, 0) / 2} trận`
                        : 'Chưa đấu'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-3 py-2 text-slate-400 font-semibold w-6">#</th>
                          <th className="text-left px-2 py-2 text-slate-400 font-semibold">Đội</th>
                          <th className="text-center px-2 py-2 text-slate-400 font-semibold w-7">TĐ</th>
                          <th className="text-center px-2 py-2 text-slate-400 font-semibold w-7">T</th>
                          <th className="text-center px-2 py-2 text-slate-400 font-semibold w-7">H</th>
                          <th className="text-center px-2 py-2 text-slate-400 font-semibold w-7">BT</th>
                          <th className="text-center px-2 py-2 text-slate-400 font-semibold w-9">HS</th>
                          <th className="text-center px-2 py-2 text-slate-400 font-semibold w-9">+/-</th>
                          <th className="text-center px-2 py-2 font-bold text-slate-600 w-8">Đ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rows.map((row, i) => (
                          <tr
                            key={row.team}
                            className={i < 2 ? 'bg-green-50/60' : i === 2 ? 'bg-blue-50/40' : ''}
                          >
                            <td className="px-3 py-2 text-center">
                              {i < 2 ? (
                                <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center mx-auto">
                                  {i + 1}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">{i + 1}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <a href={teamHref(row.team)} className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity">
                                <FlagImg team={row.team} flag={row.flag} size="xs" />
                                <span className="font-medium text-slate-800 truncate max-w-[80px] hover:text-green-600">{row.team}</span>
                              </a>
                            </td>
                            <td className="text-center px-2 py-2 text-slate-600">{row.mp}</td>
                            <td className="text-center px-2 py-2 text-slate-600">{row.w}</td>
                            <td className="text-center px-2 py-2 text-slate-600">{row.d}</td>
                            <td className="text-center px-2 py-2 text-slate-600">{row.l}</td>
                            <td className="text-center px-2 py-2 text-slate-500">{row.gf}:{row.ga}</td>
                            <td className={`text-center px-2 py-2 font-medium ${
                              row.gd > 0 ? 'text-green-600' : row.gd < 0 ? 'text-red-500' : 'text-slate-400'
                            }`}>
                              {row.gd > 0 ? `+${row.gd}` : row.gd}
                            </td>
                            <td className="text-center px-2 py-2 font-bold text-slate-800">{row.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Vào vòng 1/16
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Có thể vào vòng sau (hạng 3 tốt nhất)
            </span>
          </div>
        </>
      )}

      {/* ── TOP SCORERS ── */}
      {activeTab === 'scorers' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {topScorers.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-3xl">⚽</p>
              <p className="text-slate-500 font-medium">Chưa có dữ liệu ghi bàn</p>
              <p className="text-slate-400 text-sm">Nhấn "Sync goals" ở trên sau khi các trận kết thúc</p>
              <p className="text-slate-300 text-xs mt-1">
                Dữ liệu lấy từ openfootball/worldcup.json
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-700 text-sm">Danh sách ghi bàn · Vòng bảng</h2>
                <span className="text-xs text-slate-400">{topScorers.length} cầu thủ</span>
              </div>

              <div className="divide-y divide-slate-50">
                {topScorers.map((s, i) => (
                  <div key={`${s.player_name}||${s.team_name}`} className="flex items-center gap-3 px-4 py-3">
                    {/* Rank */}
                    <span className="text-sm font-bold w-6 text-right flex-shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                        <span className="text-slate-300">{i + 1}</span>
                      )}
                    </span>

                    {/* Flag + player info */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <a href={teamHref(s.team_name)} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                        <FlagImg team={s.team_name} flag={s.team_flag} size="sm" />
                      </a>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.player_name}</p>
                        <a href={teamHref(s.team_name)} className="text-xs text-slate-400 truncate hover:text-green-600 transition-colors">{s.team_name}</a>
                      </div>
                    </div>

                    {/* Goals */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {s.penalties > 0 && (
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {s.penalties} pen
                        </span>
                      )}
                      <span className="text-lg font-black text-slate-800 w-6 text-right">{s.goals}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
