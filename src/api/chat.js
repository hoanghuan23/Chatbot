const CHAT_ENDPOINT = '/api/chat'

function getErrorMessage(payload, status) {
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((error) => error.msg).join(', ')
  }

  if (typeof payload?.detail === 'string') return payload.detail
  return `Backend trả về HTTP ${status}`
}

export async function sendChatMessage(message, { limit = 10, cursor, signal } = {}) {
  const body = { message, limit }
  if (cursor) body.cursor = cursor

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
    throw new Error(getErrorMessage(payload, response.status))
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
  if (!response.ok) throw new Error(getErrorMessage(payload, response.status))
  if (!Array.isArray(payload?.results)) {
    throw new Error('Phản hồi từ backend không có danh sách results hợp lệ')
  }
  return payload
}
