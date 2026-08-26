import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Soha chat UI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the welcome screen without fake chat history', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Hi, I am Hot search — your knowledge, within reach.',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
    expect(screen.queryByText('Last 30 Days')).not.toBeInTheDocument()
  })

  it('places a suggestion in the composer without sending it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tin mới nhất về bão số 4?' }))

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Tin mới nhất về bão số 4?')
    expect(screen.queryByLabelText('Current conversation')).not.toBeInTheDocument()
  })

  it('sends a trimmed local user message with Enter', async () => {
    const user = userEvent.setup()
    render(<App />)
    const composer = screen.getByRole('textbox', { name: 'Message' })

    await user.type(composer, '  Xin chào Soha{Enter}')

    expect(screen.getByLabelText('Current conversation')).toHaveTextContent('Xin chào Soha')
    expect(composer).toHaveValue('')
  })

  it('does not send empty content and supports Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<App />)
    const composer = screen.getByRole('textbox', { name: 'Message' })
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    expect(sendButton).toBeDisabled()
    await user.type(composer, 'Dòng một{Shift>}{Enter}{/Shift}Dòng hai')

    expect(composer).toHaveValue('Dòng một\nDòng hai')
    expect(screen.queryByLabelText('Current conversation')).not.toBeInTheDocument()
  })

  it('clears the current local conversation with New Chat', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Tin nhắn{Enter}')
    await user.click(screen.getByRole('button', { name: 'New Chat' }))

    expect(screen.queryByText('Tin nhắn')).not.toBeInTheDocument()
    expect(screen.getByText('You can ask me')).toBeInTheDocument()
  })

  it('sends the backend schema and renders its answer', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: 'Đây là câu trả lời từ Neo4j.',
        query: { intent: 'search_events', location: null, hours: 24 },
        count: 0,
        results: [],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Có sự kiện gì?{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Đây là câu trả lời từ Neo4j.')).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Có sự kiện gì?', limit: 10 }),
      }),
    )
  })

  it('links an event to its newest original post and shows its related post count', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: '• Bão số 4 xoay vòng trên Vịnh Bắc Bộ',
        count: 1,
        results: [{
          id: 'event-4',
          posts: [
            { url: 'https://soha.vn/older-post', posted_at: '2026-08-20T08:00:00Z' },
            { url: 'https://vnexpress.net/newest-post', posted_at: '2026-08-21T08:00:00Z' },
          ],
        }],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Tin về bão?{Enter}')

    const sourceLink = await screen.findByRole('link', { name: 'Mở bài viết gốc trên VnExpress' })
    expect(sourceLink).toHaveAttribute('href', 'https://vnexpress.net/newest-post')
    expect(sourceLink).toHaveAttribute('target', '_blank')
    expect(sourceLink).toHaveTextContent('VnExpress - 21/08/2026 15:00+2')
  })

  it('renders the structured backend event format and expands all source posts', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: 'Nội dung dạng văn bản dự phòng',
        count: 1,
        results: [{
          event_key: 'event-vetc',
          title: 'VETC tạm dừng thu phí ví điện tử',
          description: 'VETC quyết định tạm dừng triển khai chính sách thu phí dịch vụ ví điện tử.',
          post: {
            source_name: 'Tuổi Trẻ',
            url: 'https://example.com/latest',
            posted_at: '2026-08-22T07:52:14',
          },
          sources: [
            { source: 'Tuổi Trẻ', url: 'https://example.com/older', posted_at: '2026-08-20T06:08:16' },
            { source: 'GIAO THÔNG VĂN MINH', url: 'https://example.com/latest', posted_at: '2026-08-22T07:52:14' },
          ],
        }],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Tin VETC?{Enter}')

    const firstEventTitle = await screen.findByText('Sự kiện 1: VETC tạm dừng thu phí ví điện tử')
    const eventIntro = screen.getByText('Dưới đây là các sự kiện liên quan:')

    expect(eventIntro).toBeInTheDocument()
    expect(eventIntro.compareDocumentPosition(firstEventTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('2 bài viết đề cập')).toBeInTheDocument()
    expect(screen.getByText('20/08 – 22/08/2026')).toBeInTheDocument()
    expect(screen.getByText('Nguồn gần nhất:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /GIAO THÔNG VĂN MINH/ })).toHaveAttribute(
      'href',
      'https://example.com/latest',
    )

    await user.click(screen.getByRole('button', { name: /Xem 2 bài viết/ }))

    expect(screen.getByRole('link', { name: /Tuổi Trẻ/ })).toHaveAttribute(
      'href',
      'https://example.com/older',
    )
  })

  it('sorts events on the same date by mention count, then by newest post', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: 'Nội dung dự phòng',
        count: 4,
        results: [
          {
            event_key: 'newest-one-mention',
            title: 'Một lượt đề cập mới nhất',
            description: 'Sự kiện có một lượt đề cập lúc 09:07.',
            sources: [{ source: 'UFC', url: 'https://example.com/ufc', posted_at: '2026-08-26T02:07:00Z' }],
          },
          {
            event_key: 'two-mentions-older',
            title: 'Hai lượt đề cập cũ hơn',
            description: 'Sự kiện có hai lượt đề cập lúc 08:14.',
            sources: [
              { source: 'CBS News', url: 'https://example.com/cbs', posted_at: '2026-08-26T01:14:00Z' },
              { source: 'Soha', url: 'https://example.com/soha', posted_at: '2026-08-26T00:00:00Z' },
            ],
          },
          {
            event_key: 'two-mentions-newer',
            title: 'Hai lượt đề cập mới hơn',
            description: 'Sự kiện có hai lượt đề cập lúc 08:30.',
            sources: [
              { source: 'VnExpress', url: 'https://example.com/vne', posted_at: '2026-08-26T01:30:00Z' },
              { source: 'Tuổi Trẻ', url: 'https://example.com/tuoitre', posted_at: '2026-08-25T23:00:00Z' },
            ],
          },
          {
            event_key: 'previous-day',
            title: 'Ngày hôm trước',
            description: 'Sự kiện thuộc ngày hôm trước.',
            sources: [
              { source: 'Nguồn 1', url: 'https://example.com/old-1', posted_at: '2026-08-25T15:00:00Z' },
              { source: 'Nguồn 2', url: 'https://example.com/old-2', posted_at: '2026-08-25T14:00:00Z' },
              { source: 'Nguồn 3', url: 'https://example.com/old-3', posted_at: '2026-08-25T13:00:00Z' },
            ],
          },
        ],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Sắp xếp sự kiện?{Enter}')

    const titles = await screen.findAllByText(/^Sự kiện \d+:/)
    expect(titles.map((title) => title.textContent)).toEqual([
      'Sự kiện 1: Hai lượt đề cập mới hơn',
      'Sự kiện 2: Hai lượt đề cập cũ hơn',
      'Sự kiện 3: Một lượt đề cập mới nhất',
      'Sự kiện 4: Ngày hôm trước',
    ])
  })

  it('loads and appends the next page of events with the backend cursor', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => ({
      event_key: `event-${index + 1}`,
      description: `Nội dung sự kiện ${index + 1}`,
      sources: [],
    }))

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'Trang sự kiện đầu tiên',
          count: 10,
          results: firstPage,
          has_more: true,
          next_cursor: 'cursor-page-2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'Trang sự kiện tiếp theo',
          count: 2,
          results: [
            { event_key: 'event-11', description: 'Nội dung sự kiện 11', sources: [] },
            { event_key: 'event-12', description: 'Nội dung sự kiện 12', sources: [] },
          ],
          has_more: false,
          next_cursor: null,
        }),
      })

    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Danh sách sự kiện?{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Xem tiếp' }))

    expect(await screen.findByText('Sự kiện 11')).toBeInTheDocument()
    expect(screen.getByText('Nội dung sự kiện 12')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xem tiếp' })).not.toBeInTheDocument()
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'xem tiếp',
          limit: 10,
          cursor: 'cursor-page-2',
        }),
      }),
    )
  })

  it('hides the source list toggle when a structured event has only one post', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: 'Nội dung dự phòng',
        count: 1,
        results: [{
          event_key: 'single-post-event',
          description: 'Sự kiện chỉ có một bài viết.',
          sources: [{
            source: 'Soha',
            url: 'https://soha.vn/single-post',
            posted_at: '2026-08-22T07:52:14',
          }],
        }],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Một bài viết?{Enter}')

    expect(await screen.findByRole('link', { name: /^Soha 22\/08\/2026/ })).toHaveAttribute(
      'href',
      'https://soha.vn/single-post',
    )
    expect(screen.queryByRole('button', { name: /Xem 1 bài viết/ })).not.toBeInTheDocument()
  })

  it('shows source information once for events sharing the same platform id', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: 'Nội dung dự phòng',
        count: 2,
        results: [
          {
            event_key: 'shared-post-event-1',
            description: 'Tổng thống Đài Loan tuyên bố khi tới thăm một hòn đảo.',
            post: { platform_id: 'shared-post-24' },
            sources: [{
              source: 'BBC News Tiếng Việt',
              url: 'https://example.com/shared-post',
              posted_at: '2026-08-24T00:00:00',
            }],
          },
          {
            event_key: 'shared-post-event-2',
            description: 'Ông đã dâng hoa tại công viên tưởng niệm.',
            post: { platform_id: 'shared-post-24' },
            sources: [{
              source: 'BBC News Tiếng Việt',
              url: 'https://example.com/shared-post',
              posted_at: '2026-08-24T00:00:00',
            }],
          },
        ],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Tin Đài Loan?{Enter}')

    const firstEvent = (await screen.findByText('Sự kiện 1')).closest('.event-result')
    const lastEvent = screen.getByText('Sự kiện 2').closest('.event-result')
    expect(screen.getAllByText('1 bài viết đề cập')).toHaveLength(1)
    expect(screen.getAllByText('Nguồn gần nhất:')).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: /BBC News Tiếng Việt/ })).toHaveLength(1)
    expect(firstEvent.querySelector('.event-result-meta')).not.toBeInTheDocument()
    expect(firstEvent.querySelector('.event-latest-source')).not.toBeInTheDocument()
    expect(lastEvent.querySelector('.event-result-meta')).toBeInTheDocument()
    expect(lastEvent.querySelector('.event-latest-source')).toBeInTheDocument()
  })

  it('places each citation beside its source line in event sections', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: [
          'Sự kiện 1',
          'Nội dung thứ nhất.',
          'Nguồn: Báo Một',
          '',
          'Sự kiện 2',
          'Nội dung thứ hai.',
          'Nguồn: Báo Hai',
        ].join('\n'),
        count: 2,
        results: [
          { id: 'event-1', url: 'https://example.com/one' },
          { id: 'event-2', url: 'https://example.org/two' },
        ],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Hai sự kiện?{Enter}')

    const firstSourceLink = await screen.findByRole('link', { name: 'Mở bài viết gốc trên Báo Một' })
    const secondSourceLink = screen.getByRole('link', { name: 'Mở bài viết gốc trên Báo Hai' })
    const firstSourceLine = firstSourceLink.closest('.answer-line')
    const secondSourceLine = secondSourceLink.closest('.answer-line')

    expect(firstSourceLine).toHaveTextContent('Nguồn: Báo Một+1')
    expect(secondSourceLine).toHaveTextContent('Nguồn: Báo Hai+1')
    expect(firstSourceLink).toHaveAttribute('href', 'https://example.com/one')
    expect(secondSourceLink).toHaveAttribute('href', 'https://example.org/two')
  })

  it('groups source lines when events have the same platform id', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        answer: [
          'Sự kiện 1',
          'Nội dung thứ nhất.',
          'Nguồn: Thanh28',
          '',
          'Sự kiện 2',
          'Nội dung thứ hai.',
          'Nguồn: Thanh28',
          '',
          'Sự kiện 3',
          'Nội dung thứ ba.',
          'Nguồn: Thanh28',
        ].join('\n'),
        count: 3,
        results: [
          { id: 'event-1', platform_id: 'post-28', url: 'https://thanhnien.vn/post-28' },
          { id: 'event-2', platform_id: 'post-28', url: 'https://thanhnien.vn/post-28' },
          { id: 'event-3', platform_id: 'post-28', url: 'https://thanhnien.vn/post-28' },
        ],
      }),
    })
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Ba sự kiện?{Enter}')

    const sharedLabel = await screen.findByText('Nguồn chung:')
    const sourceLink = screen.getByRole('link', { name: 'Mở bài viết gốc trên Thanh Niên' })

    expect(sharedLabel.closest('.message')).toHaveTextContent('Sự kiện 1')
    expect(screen.queryByText('Nguồn: Thanh28')).not.toBeInTheDocument()
    expect(sourceLink).toHaveAttribute('href', 'https://thanhnien.vn/post-28')
    expect(sourceLink).toHaveTextContent('Thanh Niên+1')
    expect(document.querySelectorAll('.event-source-link')).toHaveLength(1)
  })
})
