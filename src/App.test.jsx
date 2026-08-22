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
    expect(sourceLink).toHaveTextContent('VnExpress+2')
  })
})
