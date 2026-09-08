import { getEventSources } from '../utils/eventSources'
import EventResults from './EventResults'
import EventSourceLink from './EventSourceLink'

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
  if (hasStructuredEventResults(message.results)) {
    return (
      <>
        <p className="event-results-intro">Kết quả tìm kiếm:</p>
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

export default function MessageList({ messages, onLoadMore, onRelated, isBusy }) {
  return (
    <section className="message-list" aria-live="polite" aria-label="Current conversation">
      {messages.map((message) => (
        <article
          className={`message ${message.role}${message.isError ? ' error' : ''}`}
          key={message.id}
        >
          {message.role === 'assistant' && !message.isError ? (
            <>
              <AssistantContent message={message} />
              {((message.hasMore && message.nextCursor) || (
                message.query?.intent === 'search_events' && message.query.location && !message.related
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
                  {message.query?.intent === 'search_events' && message.query.location && !message.related && (
                    <button className="load-more-events" type="button" disabled={isBusy} onClick={() => onRelated(message.id)}>
                      Sự kiện liên quan
                    </button>
                  )}
                </div>
              )}
              {message.query?.intent === 'search_events' && message.query.location && message.related && (
                <RelatedEvents message={message} onRelated={onRelated} isBusy={isBusy} />
              )}
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

function RelatedEvents({ message, onRelated, isBusy }) {
  const related = message.related
  return (
    <section className="related-events" aria-label={`Khám phá các sự kiện theo từng khu vực ở ${message.query.location}`} aria-busy={related.isLoading}>
      <h3 className="event-results-intro">Khám phá các sự kiện theo từng khu vực ở {message.query.location}</h3>
      {related.results?.length > 0 && <EventResults results={related.results} />}
      {related.loaded && !related.results?.length && <p>Không tìm thấy sự kiện liên quan.</p>}
      {related.isLoading && <p role="status">Đang tải…</p>}
      {related.error && <p className="load-more-error" role="alert">{related.error}</p>}
      {(related.error || (related.loaded && related.hasMore && related.nextCursor)) && (
        <div className="event-actions">
          <button className="load-more-events" type="button" disabled={isBusy} onClick={() => onRelated(message.id)}>
            {related.error ? 'Thử lại' : 'Xem tiếp sự kiện liên quan'}
          </button>
        </div>
      )} 
    </section>
  )
}
