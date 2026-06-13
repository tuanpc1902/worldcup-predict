'use client'

// Action type catalogue — add new values as needed
export type ActivityAction =
  | 'page_view'
  | 'login'
  | 'logout'
  | 'register'
  | 'predict_submit'
  | 'predict_save_all'
  | 'champion_pick'
  | 'match_view'
  | 'comment_post'
  | 'group_create'
  | 'group_join_request'
  | 'group_join_approve'
  | 'group_join_reject'
  | 'group_member_remove'
  | 'group_leave'
  | 'h2h_compare'
  | 'bracket_view'
  | 'leaderboard_view'
  | 'standings_view'
  | 'profile_view'
  | 'admin_match_update'
  | 'admin_score_update'
  | 'admin_user_reset_pw'
  | 'admin_user_delete'
  | 'admin_create_users'

interface LogPayload {
  action: ActivityAction
  page?: string
  detail?: Record<string, unknown>
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('wc_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('wc_session_id', id)
  }
  return id
}

export function logActivity(payload: LogPayload): void {
  // Fire-and-forget — never await this in UI code
  const page = payload.page ?? (typeof window !== 'undefined' ? window.location.pathname : undefined)
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, page, session_id: getSessionId() }),
  }).catch(() => { /* silent */ })
}

// Hook version for page view tracking
export function usePageView(page?: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  // Deduplicate: only log once per mount using a flag on the window
  const key = `_pv_${page ?? window.location.pathname}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w[key]) return
  w[key] = true
  logActivity({ action: 'page_view', page, detail })
}
