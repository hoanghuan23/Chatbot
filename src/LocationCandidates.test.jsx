import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import LocationCandidates from './components/LocationCandidates'

const sources = [
  { source_id: 'source-1', post_platform: 'facebook', post_id: '111', post_url: null, post_content: 'Chặt hạ cây đổ ra đường' },
  { source_id: 'source-2', post_platform: 'facebook', post_id: '222', post_url: 'https://example.com/post', post_content: 'Vụ việc xảy ra tại Thanh Hóa...' },
]
const event = {
  event_key: 'event-1', event_description: 'Cưa cây khiến một người tử vong', location_status: 'mentioned',
  locations: [{ mentioned_location: 'Thanh Hóa', location_chain: ['Thanh Hóa', 'miền Trung', 'Việt Nam'], source_ids: ['source-2'] }],
  sources,
}

afterEach(() => vi.unstubAllGlobals())

it('renders one event from the API with locations and a single source list, ignoring legacy candidates and pagination', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    answer: 'Câu trả lời dự phòng', query: { intent: 'locate_event' }, count: 1,
    results: [], location_events: [event], location_candidates: [{ event_description: 'Dữ liệu cũ' }],
    has_more: true, next_cursor: 'unsupported',
  }) }))
  const user = userEvent.setup()
  render(<App />)
  await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Sự kiện diễn ra ở đâu?{Enter}')
  const card = await screen.findByRole('region', { name: 'Sự kiện 1' })
  expect(screen.getByText('1 sự kiện trong kết quả')).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Sự kiện 2' })).not.toBeInTheDocument()
  expect(within(card).getByText(event.event_description)).toBeVisible()
  expect(within(card).getByText('Thanh Hóa → miền Trung → Việt Nam')).toBeVisible()
  expect(within(card).queryByRole('list', { name: 'Bài viết cung cấp địa điểm' })).not.toBeInTheDocument()
  expect(within(card).queryByText(sources[0].post_content)).not.toBeInTheDocument()
  await user.click(within(card).getByText('Bài viết nguồn (2)'))
  const sourceList = card.querySelector('.location-source-list')
  expect(within(sourceList).getAllByRole('listitem')).toHaveLength(2)
  expect(within(sourceList).getByRole('link', { name: 'facebook' })).toBeVisible()
  expect(screen.queryByText(/Chưa có địa điểm được ghi nhận/)).not.toBeInTheDocument()
  expect(screen.queryByText('Dữ liệu cũ')).not.toBeInTheDocument()
  expect(screen.queryByText('Câu trả lời dự phòng')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Xem tiếp' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sự kiện liên quan' })).not.toBeInTheDocument()
})

it('shows missing location once per unknown event and falls back to its event key', () => {
  render(<LocationCandidates events={[{ ...event, event_description: null, location_status: 'unknown', locations: [] }]} />)
  expect(screen.getByText('event-1')).toBeVisible()
  expect(screen.getAllByText('Chưa có địa điểm được ghi nhận cho sự kiện')).toHaveLength(1)
})

it('preserves every branch and keeps sources in their event source list', async () => {
  render(<LocationCandidates events={[{
    ...event, locations: [...event.locations, { location_chain: ['Thanh Hóa', 'Việt Nam'], source_ids: ['source-1'] }],
  }, {
    ...event, event_key: 'event-2', event_description: 'Sự kiện khác',
    locations: [{ location_chain: ['Hà Nội', 'Việt Nam'], source_ids: ['source-2', 'missing'] }],
    sources: [{ ...sources[1], post_url: 'https://example.com/other' }],
  }]} />)
  const first = screen.getByRole('region', { name: 'Sự kiện 1' })
  const second = screen.getByRole('region', { name: 'Sự kiện 2' })
  expect(within(first).getByText('Thanh Hóa → miền Trung → Việt Nam')).toBeVisible()
  expect(within(first).getByText('Thanh Hóa → Việt Nam')).toBeVisible()
  expect(within(second).queryByText(/Thanh Hóa →/)).not.toBeInTheDocument()
  await userEvent.setup().click(within(second).getByText('Bài viết nguồn (1)'))
  expect(within(second).getAllByRole('link')).toHaveLength(1)
  expect(within(second).getByRole('link')).toHaveAttribute('href', 'https://example.com/other')
})

it('handles null source fields, rejects unsafe URLs and renders source content as text', async () => {
  const user = userEvent.setup()
  render(<LocationCandidates events={[{ ...event, sources: [
    { source_id: 'source-1', post_url: 'javascript:alert(1)', post_content: '<img src=x onerror=alert(1)>' },
    { source_id: 'source-2', post_url: null, post_content: null, post_platform: null },
  ] }]} />)
  await user.click(screen.getByText('Bài viết nguồn (2)'))
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.getByTitle('<img src=x onerror=alert(1)>')).toBeVisible()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByText('Chưa có nội dung bài viết để đối chiếu.')).not.toBeInTheDocument()
})

it.each(['Không tìm thấy kết quả từ backend.', ''])('uses answer or empty state when location_events is empty (%s)', async (answer) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    answer, query: { intent: 'locate_event' }, location_events: [], location_candidates: [event],
  }) }))
  const user = userEvent.setup()
  render(<App />)
  await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Ở đâu?{Enter}')
  expect(await screen.findByText(answer || 'Không tìm thấy sự kiện phù hợp.')).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Địa điểm theo sự kiện' })).not.toBeInTheDocument()
})

it('does not infer unknown status solely from empty locations', () => {
  render(<LocationCandidates events={[{ ...event, locations: [] }]} />)
  expect(screen.queryByText('Chưa có địa điểm được ghi nhận cho sự kiện')).not.toBeInTheDocument()
})

it('shows source names and Vietnam posting times in compact source rows with safe fallbacks', async () => {
  render(<LocationCandidates events={[{ ...event, sources: [
    { ...sources[1], source_id: 'a', source_name: 'Thời sự VTV', posted_at: '2026-09-11T04:31:00Z' },
    { ...sources[0], source_id: 'b', source_name: 'Thông tin chính phủ', posted_at: '2026-09-11T05:01:00' },
    { ...sources[1], source_id: 'c', source_name: ' ', posted_at: 'invalid' },
    { source_id: 'd', source_name: null, posted_at: null },
  ] }]} />)
  await userEvent.setup().click(screen.getByText('Bài viết nguồn (4)'))
  const list = document.querySelector('.location-source-list')
  expect(within(list).getByRole('link', { name: 'Thời sự VTV 11/09/2026 11:31' })).toBeVisible()
  expect(within(list).getByText('Thông tin chính phủ')).toBeVisible()
  expect(within(list).getByText('11/09/2026 12:01')).toBeVisible()
  expect(within(list).getByRole('link', { name: 'facebook' })).toBeVisible()
  expect(within(list).getByText('Bài viết 4')).toBeVisible()
  expect(list.querySelectorAll('time')).toHaveLength(2)
})
