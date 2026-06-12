'use client'
import { useMemo, useState } from 'react'
import FlagImg from '@/components/FlagImg'
import type { Match } from '@/types'

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

function computeTopScorers(matches: Match[]): { team: string; flag: string | null; gf: number }[] {
  const map: Record<string, { team: string; flag: string | null; gf: number }> = {}
  for (const m of matches) {
    if (m.status !== 'finished' || m.home_score === null || m.away_score === null) continue
    if (!map[m.home_team]) map[m.home_team] = { team: m.home_team, flag: m.home_flag, gf: 0 }
    if (!map[m.away_team]) map[m.away_team] = { team: m.away_team, flag: m.away_flag, gf: 0 }
    map[m.home_team].gf += m.home_score
    map[m.away_team].gf += m.away_score
  }
  return Object.values(map).filter(t => t.gf > 0).sort((a, b) => b.gf - a.gf)
}

interface Props { matches: Match[] }

export default function StandingsClient({ matches }: Props) {
  const [activeTab, setActiveTab] = useState<'standings' | 'goals'>('standings')
  const standings = useMemo(() => computeStandings(matches), [matches])
  const topScorers = useMemo(() => computeTopScorers(matches), [matches])

  const groupNames = Object.keys(standings).sort()
  const hasData = groupNames.length > 0
  const finishedCount = matches.filter(m => m.status === 'finished').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 Bảng xếp hạng</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vòng bảng · {finishedCount}/{matches.length} trận đã hoàn thành
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('standings')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'standings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Bảng đấu
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'goals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Bàn thắng theo đội
        </button>
      </div>

      {!hasData && (
        <div className="text-center bg-white rounded-2xl border border-slate-200 py-20">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-slate-500">Chưa có dữ liệu vòng bảng.</p>
          <p className="text-slate-400 text-sm mt-1">Vui lòng sync lịch thi đấu từ trang admin.</p>
        </div>
      )}

      {hasData && activeTab === 'standings' && (
        <div className="grid gap-5 md:grid-cols-2">
          {groupNames.map(groupName => {
            const rows = standings[groupName]
            return (
              <div key={groupName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-700 text-sm">{groupName}</h2>
                  <span className="text-xs text-slate-400">
                    {rows.filter(r => r.mp > 0).length > 0 ? `${rows.reduce((s, r) => s + r.mp, 0) / 2} trận` : 'Chưa đấu'}
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
                          className={`${
                            i < 2
                              ? 'bg-green-50/60'
                              : i === 2 && rows.length >= 3
                              ? 'bg-blue-50/40'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-slate-400 text-center">
                            {i < 2 ? (
                              <span className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center mx-auto">
                                {i + 1}
                              </span>
                            ) : (
                              <span className="text-slate-300">{i + 1}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FlagImg team={row.team} flag={row.flag} size="xs" />
                              <span className="font-medium text-slate-800 truncate max-w-[80px]">{row.team}</span>
                            </div>
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
      )}

      {/* Legend */}
      {hasData && activeTab === 'standings' && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Vào vòng 1/16
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Có thể vào vòng sau (hạng 3 tốt nhất)
          </span>
        </div>
      )}

      {/* Goals by team */}
      {hasData && activeTab === 'goals' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {topScorers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-3xl mb-2">⚽</p>
              <p>Chưa có trận nào hoàn thành</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-slate-700 text-sm">Bàn thắng theo đội · Vòng bảng</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {topScorers.map((t, i) => {
                  const max = topScorers[0]?.gf ?? 1
                  const pct = Math.round((t.gf / max) * 100)
                  return (
                    <div key={t.team} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                      <FlagImg team={t.team} flag={t.flag} size="xs" />
                      <span className="text-sm font-medium text-slate-800 w-32 truncate flex-shrink-0">{t.team}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-700 w-6 text-right flex-shrink-0">{t.gf}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Player scorers note */}
      {hasData && activeTab === 'goals' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <span className="font-semibold">ℹ️ Dữ liệu cầu thủ ghi bàn</span>
          <span className="ml-1 font-normal text-amber-600">đang được cập nhật — sẽ bổ sung trong phiên bản tới.</span>
        </div>
      )}
    </div>
  )
}
