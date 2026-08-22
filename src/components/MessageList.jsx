import EventSourceLink, { getEventSources } from './EventSourceLink'

function AssistantContent({ message }) {
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
  const citationIndexes = sourceLineIndexes.length >= sources.length
    ? sourceLineIndexes
    : itemIndexes

  if (citationIndexes.length >= sources.length) {
    const sourceByLine = new Map(citationIndexes.slice(0, sources.length).map((line, index) => [line, sources[index]]))

    return lines.map((line, index) => {
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
