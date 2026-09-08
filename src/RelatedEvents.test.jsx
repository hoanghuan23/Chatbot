import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { searchRelatedEvents } from './api/chat'

const query = { intent: 'search_events', location: 'Hà Nội', entity: 'A', hours: 48, posted_date: null }
const event = (key) => ({ event_key: key, description: key, sources: [] })
const response = (payload) => ({ ok: true, json: async () => payload })
async function start(payload = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ answer: 'Ban đầu', query, results: [], ...payload })))
  const user = userEvent.setup()
  render(<App />)
  await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Tìm sự kiện{Enter}')
  return user
}
afterEach(() => vi.unstubAllGlobals())

it('keeps query, results and cursors independent across both pagination flows', async () => {
  const user = await start({ results: [event('Trực tiếp')], has_more: true, next_cursor: 'direct-2' })
  fetch.mockResolvedValueOnce(response({ results: [event('Liên quan 1')], has_more: true, next_cursor: 'related-2' }))
  await user.click(screen.getByRole('button', { name: 'Sự kiện liên quan' }))
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ query, limit: 10, cursor: null })
  expect(fetch.mock.calls[1][0]).toBe('/api/search/related')
  const group = screen.getByRole('region', { name: 'Khám phá các sự kiện theo từng khu vực ở Hà N' })
  expect(within(group).getByText('Liên quan 1')).toBeInTheDocument()
  expect(within(group).queryByText('Trực tiếp')).not.toBeInTheDocument()
  fetch.mockResolvedValueOnce(response({ answer: '', results: [event('Trực tiếp 2')], has_more: false }))
  await user.click(screen.getByRole('button', { name: 'Xem tiếp', exact: true }))
  expect(JSON.parse(fetch.mock.calls[2][1].body).cursor).toBe('direct-2')
  fetch.mockResolvedValueOnce(response({ results: [event('Liên quan 2')], has_more: false }))
  await user.click(screen.getByRole('button', { name: 'Xem tiếp sự kiện liên quan' }))
  expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ query, limit: 10, cursor: 'related-2' })
  for (const text of ['Trực tiếp', 'Trực tiếp 2', 'Liên quan 1', 'Liên quan 2']) expect(screen.getByText(text)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Xem tiếp sự kiện liên quan' })).not.toBeInTheDocument()
})

it('offers related search on empty direct results and retries errors before showing empty state', async () => {
  const user = await start()
  fetch.mockRejectedValueOnce(new Error('Mất kết nối'))
  await user.click(screen.getByRole('button', { name: 'Sự kiện liên quan' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối')
  fetch.mockResolvedValueOnce(response({ results: [] }))
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(screen.getByText('Không tìm thấy sự kiện liên quan.')).toBeInTheDocument()
  expect(screen.getByText('Ban đầu')).toBeInTheDocument()
  expect(JSON.parse(fetch.mock.calls[2][1].body).cursor).toBeNull()
})

it('preserves loaded related results and cursor when the next page fails', async () => {
  const user = await start()
  fetch.mockResolvedValueOnce(response({ results: [event('Đã tải')], has_more: true, next_cursor: 'next' }))
  await user.click(screen.getByRole('button', { name: 'Sự kiện liên quan' }))
  fetch.mockRejectedValueOnce(new Error('Lỗi trang'))
  await user.click(screen.getByRole('button', { name: 'Xem tiếp sự kiện liên quan' }))
  expect(screen.getByText('Đã tải')).toBeInTheDocument()
  fetch.mockResolvedValueOnce(response({ results: [event('Trang sau')] }))
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(JSON.parse(fetch.mock.calls[3][1].body).cursor).toBe('next')
  expect(screen.getByText('Đã tải')).toBeInTheDocument()
  expect(screen.getByText('Trang sau')).toBeInTheDocument()
})

it.each([undefined, { ...query, location: null }, { ...query, intent: 'other' }])('hides related action for ineligible query %j', async (queryValue) => {
  await start({ query: queryValue })
  expect(screen.queryByRole('button', { name: 'Sự kiện liên quan' })).not.toBeInTheDocument()
})

it('locks requests while loading and discards late related responses after New Chat', async () => {
  const user = await start({ has_more: true, next_cursor: 'direct' })
  let resolve
  fetch.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await user.dblClick(screen.getByRole('button', { name: 'Sự kiện liên quan' }))
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('status')).toHaveTextContent('Đang tải…')
  expect(screen.getByRole('button', { name: 'Xem tiếp' })).toBeDisabled()
  const signal = fetch.mock.calls[1][1].signal
  await user.click(screen.getByRole('button', { name: 'New Chat' }))
  expect(signal.aborted).toBe(true)
  await act(async () => resolve(response({ results: [event('Cũ')] })))
  expect(screen.queryByText('Cũ')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Current conversation')).not.toBeInTheDocument()
})

it('rejects malformed related responses without requiring answer', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ results: null })))
  await expect(searchRelatedEvents(query)).rejects.toThrow('results')
})
