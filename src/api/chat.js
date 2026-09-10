const CHAT_ENDPOINT = '/api/chat'

function getErrorMessage(payload, status) {
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((error) => error.msg).join(', ')
  }

  if (typeof payload?.detail === 'string') return payload.detail
  return `Backend trả về HTTP ${status}`
}

export function canSearchRelated(query) {
  const hasValue = (value) => Array.isArray(value)
    ? value.some((item) => typeof item === 'string' && item.trim())
    : typeof value === 'string' && value.trim().length > 0
  return Boolean(query && (!query.intent || query.intent === 'search_events')
    && (hasValue(query.location) || hasValue(query.entity)))
}

function apiError(payload, status) {
  const error = new Error(getErrorMessage(payload, status))
  error.status = status
  return error
}

export async function sendChatMessage(message, { limit = 10, cursor, query, signal } = {}) {
  const body = { message, limit }
  if (cursor) body.cursor = cursor
  if (query) body.query = query

  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw apiError(payload, response.status)
  }

  if (typeof payload?.answer !== 'string') {
    throw new Error('Phản hồi từ backend không có trường answer')
  }

  return payload
}

export async function searchRelatedEvents(query, { limit = 10, cursor = null, signal } = {}) {
  const response = await fetch('/api/search/related', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, cursor }),
    signal,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw apiError(payload, response.status)
  if (!Array.isArray(payload?.results)) {
    throw new Error('Phản hồi từ backend không có danh sách results hợp lệ')
  }
  return payload
}
