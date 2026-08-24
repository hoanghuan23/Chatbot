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
    return <EventResults results={message.results} />
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

export default function MessageList({ messages }) {
  return (
    <section className="message-list" aria-live="polite" aria-label="Current conversation">
      {messages.map((message) => (
        <article
          className={`message ${message.role}${message.isError ? ' error' : ''}`}
          key={message.id}
        >
          {message.role === 'assistant' && !message.isError
            ? <AssistantContent message={message} />
            : message.content}
        </article>
      ))}
    </section>
  )
}
