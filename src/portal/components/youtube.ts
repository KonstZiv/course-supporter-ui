// Robust YouTube watch → embed conversion (Phase 6 / T4b, c2, corrective 4).
// Handles youtu.be/<id>, youtube.com/watch?v=<id>, /embed/<id>, /shorts/<id>,
// and a start timecode (?t= / ?start= / #t=, in seconds or 1h2m3s form).
// Returns null for anything it cannot parse → the caller falls back to a
// link-out (never an empty render).

function parseTimecode(t: string): number | null {
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) {
    return null
  }
  const h = parseInt(m[1] ?? '0', 10)
  const min = parseInt(m[2] ?? '0', 10)
  const s = parseInt(m[3] ?? '0', 10)
  return h * 3600 + min * 60 + s
}

function parseStart(u: URL): number | null {
  const hashMatch = u.hash.match(/[#&]t=([^&]+)/)
  const t = u.searchParams.get('start') ?? u.searchParams.get('t') ?? hashMatch?.[1]
  return t ? parseTimecode(t) : null
}

export function youtubeEmbedUrl(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '')
  let id = ''
  if (host === 'youtu.be') {
    id = u.pathname.slice(1).split('/')[0] ?? ''
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com'
  ) {
    if (u.pathname === '/watch') {
      id = u.searchParams.get('v') ?? ''
    } else if (u.pathname.startsWith('/embed/')) {
      id = u.pathname.slice('/embed/'.length).split('/')[0] ?? ''
    } else if (u.pathname.startsWith('/shorts/')) {
      id = u.pathname.slice('/shorts/'.length).split('/')[0] ?? ''
    }
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null

  const start = parseStart(u)
  const base = `https://www.youtube.com/embed/${id}`
  return start !== null ? `${base}?start=${start}` : base
}
