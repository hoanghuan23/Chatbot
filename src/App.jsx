import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { sendChatMessage } from './api/chat'
import ChatComposer from './components/ChatComposer'
import MessageList from './components/MessageList'
import Sidebar from './components/Sidebar'
import WelcomePanel from './components/WelcomePanel'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const activeRequestRef = useRef(null)

  useEffect(() => () => activeRequestRef.current?.abort(), [])

  const handleSend = async (content) => {
    const cleanContent = content.trim()
    if (!cleanContent || isSending) return

    const controller = new AbortController()
    activeRequestRef.current = controller

    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'user',
        content: cleanContent,
      },
    ])
    setDraft('')
    setIsSending(true)

    try {
      const response = await sendChatMessage(cleanContent, {
        limit: 10,
        signal: controller.signal,
      })

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: 'assistant',
          content: response.answer,
          count: response.count,
          results: response.results,
          hasMore: response.has_more === true,
          nextCursor: response.next_cursor,
        },
      ])
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            role: 'assistant',
            content: `Không thể lấy câu trả lời: ${error.message}`,
            isError: true,
          },
        ])
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null
        setIsSending(false)
      }
    }
  }

  const handleLoadMore = async (messageId) => {
    if (isSending) return

    const message = messages.find((item) => item.id === messageId)
    if (!message?.hasMore || !message.nextCursor) return

    const controller = new AbortController()
    activeRequestRef.current = controller
    setIsSending(true)
    setMessages((current) => current.map((item) => (
      item.id === messageId
        ? { ...item, isLoadingMore: true, loadMoreError: null }
        : item
    )))

    try {
      const response = await sendChatMessage('xem tiếp', {
        limit: 10,
        cursor: message.nextCursor,
        signal: controller.signal,
      })

      setMessages((current) => current.map((item) => {
        if (item.id !== messageId) return item

        const nextResults = Array.isArray(response.results) ? response.results : []
        const currentResults = Array.isArray(item.results) ? item.results : []

        return {
          ...item,
          count: currentResults.length + nextResults.length,
          results: [...currentResults, ...nextResults],
          hasMore: response.has_more === true,
          nextCursor: response.next_cursor,
          isLoadingMore: false,
          loadMoreError: null,
        }
      }))
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages((current) => current.map((item) => (
          item.id === messageId
            ? {
                ...item,
                isLoadingMore: false,
                loadMoreError: `Không thể xem tiếp: ${error.message}`,
              }
            : item
        )))
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null
        setIsSending(false)
      }
    }
  }

  const handleNewChat = () => {
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
    setIsSending(false)
    setMessages([])
    setDraft('')
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
      />

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="chat-main">
        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={21} />
        </button>

        <div className={`chat-content ${messages.length ? 'has-messages' : ''}`}>
          {messages.length === 0 ? (
            <WelcomePanel onSuggestionSelect={setDraft} />
          ) : (
            <MessageList messages={messages} onLoadMore={handleLoadMore} />
          )}

          <ChatComposer
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            isSending={isSending}
          />
        </div>
      </main>
    </div>
  )
}
