const vietnameseDateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatVietnameseDateTime(value) {
  if (!value) return null

  const normalizedValue = typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value.trim())
    ? `${value.trim().replace(' ', 'T')}Z`
    : value
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return null

  const parts = Object.fromEntries(
    vietnameseDateTimeFormatter
      .formatToParts(date)
      .map(({ type, value: partValue }) => [type, partValue]),
  )

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

