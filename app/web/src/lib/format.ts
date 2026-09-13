const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type DateInput = string | Date | null | undefined

function parseParts(value: DateInput): { y: number; m: number; d: number; hh: number; mm: number } | null {
  if (value == null) return null

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
    if (match) {
      return {
        y: +match[1],
        m: +match[2],
        d: +match[3],
        hh: match[4] ? +match[4] : 0,
        mm: match[5] ? +match[5] : 0,
      }
    }
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return null
    return {
      y: dt.getFullYear(),
      m: dt.getMonth() + 1,
      d: dt.getDate(),
      hh: dt.getHours(),
      mm: dt.getMinutes(),
    }
  }

  if (Number.isNaN(value.getTime())) return null
  return {
    y: value.getFullYear(),
    m: value.getMonth() + 1,
    d: value.getDate(),
    hh: value.getHours(),
    mm: value.getMinutes(),
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function format12(hh: number, mm: number) {
  const h = hh % 12 === 0 ? 12 : hh % 12
  const ampm = hh < 12 ? "AM" : "PM"
  return `${h}:${pad2(mm)} ${ampm}`
}

/** 13 Sep 2026 */
export function formatDate(value: DateInput, fallback = "\u2014") {
  const p = parseParts(value)
  if (!p) return fallback
  return `${p.d} ${MONTHS[p.m]} ${p.y}`
}

/** 13 Sep 2026, 07:28 PM */
export function formatDateTime(value: DateInput, fallback = "\u2014") {
  const p = parseParts(value)
  if (!p) return fallback
  return `${p.d} ${MONTHS[p.m]} ${p.y}, ${format12(p.hh, p.mm)}`
}

/** 13 Sep */
export function formatDayMonth(value: DateInput, fallback = "\u2014") {
  const p = parseParts(value)
  if (!p) return fallback
  return `${p.d} ${MONTHS[p.m]}`
}

/** 13 Sep, 07:28 PM */
export function formatDayMonthTime(value: DateInput, fallback = "\u2014") {
  const p = parseParts(value)
  if (!p) return fallback
  return `${p.d} ${MONTHS[p.m]}, ${format12(p.hh, p.mm)}`
}

/** 07:28 PM */
export function formatTime(value: DateInput, fallback = "\u2014") {
  const p = parseParts(value)
  if (!p) return fallback
  return format12(p.hh, p.mm)
}

/** ₹1,234.56 */
export function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}
