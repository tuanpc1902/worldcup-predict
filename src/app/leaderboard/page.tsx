import { createServerSupabase } from '@/lib/supabase-server'
import type { LeaderboardEntry } from '@/types'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(50)

  const entries: LeaderboardEntry[] = data ?? []

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bảng xếp hạng</h1>
        <p className="text-gray-400 text-sm mt-1">Cập nhật sau mỗi 30 giây</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-4xl mb-3">🏆</p>
          <p>Chưa có dữ liệu. Hãy là người đầu tiên dự đoán!</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Top 3 */}
          {entries.slice(0, 3).length > 0 && (
            <div className="grid grid-cols-3 gap-3 p-6 bg-gray-800/50">
              {[entries[1], entries[0], entries[2]].filter(Boolean).map((e, i) => {
                const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3
                const sizes = ['scale-90', 'scale-110', 'scale-90']
                return (
                  <div key={e.id} className={`flex flex-col items-center gap-1 transform ${sizes[i]}`}>
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-xl font-bold text-white">
                      {e.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-lg">{medals[actualRank - 1]}</span>
                    <span className="text-white text-xs font-semibold text-center line-clamp-1">{e.display_name}</span>
                    <span className="text-yellow-400 font-bold">{e.total_points} pts</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">#</th>
                <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Người chơi</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">Điểm</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Đúng tỉ số</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Đúng KQ</th>
                <th className="text-right text-xs text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Sai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {entries.map((e, idx) => (
                <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-sm font-medium">
                    {idx < 3 ? medals[idx] : idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {e.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">{e.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-lg ${e.total_points > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {e.total_points}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 text-sm hidden sm:table-cell">{e.exact_scores}</td>
                  <td className="px-4 py-3 text-right text-blue-400 text-sm hidden sm:table-cell">{e.correct_results}</td>
                  <td className="px-4 py-3 text-right text-red-400 text-sm hidden sm:table-cell">{e.wrong_predictions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
