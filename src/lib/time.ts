const VN_TZ = 'Asia/Ho_Chi_Minh'

export function fmtTime(utc: string): string {
  return new Date(utc).toLocaleTimeString('vi-VN', {
    timeZone: VN_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export function fmtDate(utc: string): string {
  return new Date(utc).toLocaleDateString('vi-VN', {
    timeZone: VN_TZ, day: '2-digit', month: '2-digit',
  })
}

export function fmtDateFull(utc: string): string {
  return new Date(utc).toLocaleDateString('vi-VN', {
    timeZone: VN_TZ, weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

export function fmtDateTime(utc: string): string {
  return `${fmtTime(utc)} · ${fmtDate(utc)}`
}

/** True if the match kick-off time has already passed (Vietnam time) */
export function isStarted(utc: string): boolean {
  return Date.now() >= new Date(utc).getTime()
}
