import EventSourceLink, { getEventSources } from './EventSourceLink'

function AssistantContent({ message }) {
  const sources = getEventSources(message.results)

  if (!sources.length) return message.content

  const lines = message.content.split('\n')
  const itemIndexes = lines.reduce((indexes, line, index) => {
    if (/^\s*(?:[-*•]|\d+[.)])\s+/.test(line)) indexes.push(index)
    return indexes
  }, [])

  if (itemIndexes.length >= sources.length) {
    const sourceByLine = new Map(itemIndexes.slice(0, sources.length).map((line, index) => [line, sources[index]]))

    return lines.map((line, index) => (
      <span className="answer-line" key={`${index}-${line}`}>
        {line}
        {sourceByLine.has(index) && <EventSourceLink source={sourceByLine.get(index)} />}
        {index < lines.length - 1 && '\n'}
      </span>
    ))
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
