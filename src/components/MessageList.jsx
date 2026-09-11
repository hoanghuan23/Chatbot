import { canSearchRelated } from '../api/chat'
import { getEventSources } from '../utils/eventSources'
import EventResults from './EventResults'
import EventSourceLink from './EventSourceLink'
import LocationCandidates from './LocationCandidates'

function hasStructuredEventResults(results) {
  return Array.isArray(results)
    && results.length > 0
    && results.every((event) => (
      event
      && typeof event.description === 'string'
      && Array.isArray(event.sources)
    ))
}

function AssistantContent({ message }) {
  if (message.query?.intent === 'locate_event') {
    return Array.isArray(message.locationEvents) && message.locationEvents.length > 0
      ? <LocationCandidates events={message.locationEvents} />
      : <div className="location-answer">{message.content || 'Không tìm thấy sự kiện phù hợp.'}</div>
  }

  if (hasStructuredEventResults(message.results)) {
    return (
      <>
        <p className="event-results-intro">{canSearchRelated(message.query) ? 'Sự kiện trực tiếp:' : 'Kết quả tìm kiếm:'}</p>
        <EventResults results={message.results} />
      </>
    )
  }

  const sources = getEventSources(message.results)

  if (!sources.length) return message.content

  const lines = message.content.split('\n')
  const sourceLineIndexes = lines.reduce((indexes, line, index) => {
    if (/^\s*(?:nguồn|source)\s*:/i.test(line)) indexes.push(index)
    return indexes
  }, [])
  const itemIndexes = lines.reduce((indexes, line, index) => {
    if (/^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(line)) indexes.push(index)
    return indexes
  }, [])
  const sourceCount = sources.reduce((count, source) => count + source.sourcePositions.length, 0)
  const citationIndexes = sourceLineIndexes.length >= sourceCount
    ? sourceLineIndexes
    : itemIndexes

  if (citationIndexes.length >= sourceCount) {
    const sharedSources = sources.filter((source) => source.isSharedPlatform)
    const sourceByLine = new Map()
    const sharedSourceLines = new Set()

    sources.forEach((source) => {
      source.sourcePositions.forEach((position) => {
        const lineIndex = citationIndexes[position]
        if (source.isSharedPlatform) sharedSourceLines.add(lineIndex)
        else sourceByLine.set(lineIndex, source)
      })
    })

    const renderedLines = lines.map((line, index) => {
      if (sourceLineIndexes.length >= sourceCount && sharedSourceLines.has(index)) return null

      const source = sourceByLine.get(index)
      const sourceLine = source && line.match(/^(\s*(?:nguồn|source)\s*:\s*)(.*?)\s*$/i)
      const linkSource = sourceLine?.[2]
        ? { ...source, label: sourceLine[2] }
        : source

      return (
        <span className="answer-line" key={`${index}-${line}`}>
          {sourceLine ? sourceLine[1] : line}
          {linkSource && <EventSourceLink source={linkSource} />}
          {index < lines.length - 1 && '\n'}
        </span>
      )
    })

    if (!sharedSources.length) return renderedLines

    return (
      <>
        {renderedLines}
        {'\n\n'}
        <span className="shared-event-sources">
          <span>Nguồn chung:</span>{'\n'}
          <span className="event-source-list">
            {sharedSources.map((source) => (
              <EventSourceLink source={source} key={`${source.platformId}-${source.url}`} />
            ))}
          </span>
        </span>
      </>
    )
  }

  return (
    <>
      {message.content}
      <span className="event-source-list">
        {sources.map((source) => <EventSourceLink source={source} key={source.url} />)}
      </span>
    </>
  )
}

export default function MessageList({ messages, onLoadMore, onRelated, onRestart, isBusy }) {
  return (
    <section className="message-list" aria-live="polite" aria-label="Current conversation">
      {messages.map((message) => (
        <article
          className={`message ${message.role}${message.isError ? ' error' : ''}${message.query?.intent === 'locate_event' ? ' message-location' : ''}`}
          key={message.id}
        >
          {message.role === 'assistant' && !message.isError ? (
            <>
              <AssistantContent message={message} />
              {((message.hasMore && message.nextCursor) || (
                canSearchRelated(message.query) && !message.related
              )) && (
                <div className="event-actions">
                  {message.hasMore && message.nextCursor && <button
                    className="load-more-events"
                    type="button"
                    disabled={isBusy}
                    onClick={() => onLoadMore(message.id)}
                  >
                    {message.isLoadingMore ? 'Đang tải...' : 'Xem tiếp'}
                  </button>}
                  {canSearchRelated(message.query) && !message.related && (
                    <button className="load-more-events" type="button" disabled={isBusy} onClick={() => onRelated(message.id)}>
                      Sự kiện liên quan
                    </button>
                  )}
                </div>
              )}
              {canSearchRelated(message.query) && message.related && (
                <RelatedEvents message={message} onRelated={onRelated} onRestart={onRestart} isBusy={isBusy} />
              )}
              {message.cursorExpired && <button className="load-more-events" type="button" disabled={isBusy} onClick={() => onRestart(message.id)}>Tìm kiếm lại</button>}
              {message.loadMoreError && (
                <span className="load-more-error" role="alert">{message.loadMoreError}</span>
              )}
            </>
          ) : message.content}
        </article>
      ))}
    </section>
  )
}

function RelatedEvents({ message, onRelated, onRestart, isBusy }) {
  const related = message.related
  return (
    <section className="related-events" aria-label="Sự kiện liên quan" aria-busy={related.isLoading}>
      <h3 className="event-results-intro">Sự kiện liên quan</h3>
      {related.results?.length > 0 && <EventResults results={related.results} showReasons />}
      {related.loaded && !related.results?.length && <p>Không tìm thấy sự kiện liên quan.</p>}
      {related.isLoading && <p role="status">Đang tải…</p>}
      {related.error && <p className="load-more-error" role="alert">{related.error}</p>}
      {(related.error || (related.loaded && related.hasMore && related.nextCursor)) && (
        <div className="event-actions">
          <button className="load-more-events" type="button" disabled={isBusy} onClick={() => related.cursorExpired ? onRestart(message.id) : onRelated(message.id)}>
            {related.cursorExpired ? 'Tìm kiếm lại' : related.error ? 'Thử lại' : 'Xem tiếp sự kiện liên quan'}
          </button>
        </div>
      )} 
    </section>
  )
}
