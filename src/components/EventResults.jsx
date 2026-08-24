import { ChevronDown, ChevronUp, ExternalLink, Newspaper } from 'lucide-react'
import { useState } from 'react'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parseBackendDate(value) {
  if (!value) return null

  const normalizedValue = typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value.trim())
    ? `${value.trim().replace(' ', 'T')}Z`
    : value
  const date = new Date(normalizedValue)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  const date = parseBackendDate(value)
  return date ? dateFormatter.format(date) : null
}

function formatDateTime(value) {
  const date = parseBackendDate(value)
  return date ? dateTimeFormatter.format(date).replace(',', '') : null
}

function eventDateRange(sources) {
  const timestamps = sources
    .map((source) => parseBackendDate(source.posted_at)?.getTime())
    .filter((timestamp) => timestamp != null)
    .sort((left, right) => left - right)

  if (!timestamps.length) return null

  const first = formatDate(timestamps[0])
  const last = formatDate(timestamps[timestamps.length - 1])
  if (first === last) return first

  const [firstDay, firstMonth, firstYear] = first.split('/')
  const [lastDay, lastMonth, lastYear] = last.split('/')

  return firstYear === lastYear
    ? `${firstDay}/${firstMonth} – ${lastDay}/${lastMonth}/${lastYear}`
    : `${first} – ${last}`
}

function latestSource(sources) {
  return sources.reduce((latest, source) => {
    const latestTime = parseBackendDate(latest?.posted_at)?.getTime() ?? -Infinity
    const sourceTime = parseBackendDate(source.posted_at)?.getTime() ?? -Infinity
    return sourceTime > latestTime ? source : latest
  }, null)
}

function EventResult({ event, index, sources, showSourceInfo }) {
  const [expanded, setExpanded] = useState(false)
  const latest = latestSource(sources) || event.post
  const dateRange = eventDateRange(sources)
  const count = sources.length
  const panelId = `event-sources-${event.event_key || index}`

  return (
    <section className="event-result">
      <div className="event-result-title">Sự kiện {index + 1}</div>

      <p className="event-result-description">{event.description}</p>

      {showSourceInfo && (
        <div className="event-result-meta">
          <Newspaper size={13} aria-hidden="true" />
          <span>{count} bài viết đề cập</span>
          {dateRange && <><span aria-hidden="true">·</span><span>{dateRange}</span></>}
        </div>
      )}

      {showSourceInfo && latest?.url && (
        <div className="event-latest-source">
          <span>Nguồn gần nhất:</span>
          <a href={latest.url} target="_blank" rel="noopener noreferrer">
            <span>{latest.source || event.post?.source_name || 'Xem nguồn'}</span>
            {formatDateTime(latest.posted_at) && <time>{formatDateTime(latest.posted_at)}</time>}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      )}

      {showSourceInfo && count > 1 && (
        <button
          className="event-sources-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>[ Xem {count} bài viết</span>
          {expanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
          <span>]</span>
        </button>
      )}

      {showSourceInfo && expanded && (
        <div className="event-sources-detail" id={panelId}>
          {sources.map((source, sourceIndex) => (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              key={`${source.url}-${sourceIndex}`}
            >
              <span>{source.source || `Nguồn ${sourceIndex + 1}`}</span>
              {formatDateTime(source.posted_at) && <time>{formatDateTime(source.posted_at)}</time>}
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

export default function EventResults({ results }) {
  const sourceGroups = new Map()

  results.forEach((event, index) => {
    const platformId = event.post?.platform_id ?? event.platform_id
    const groupKey = platformId == null
      ? `event-${index}`
      : `platform-${typeof platformId}-${String(platformId)}`
    const group = sourceGroups.get(groupKey) || { lastIndex: index, sources: [] }
    group.lastIndex = index
    group.sources.push(...event.sources.filter((source) => source?.url))
    sourceGroups.set(groupKey, group)
  })

  return (
    <div className="event-results">
      {results.map((event, index) => {
        const platformId = event.post?.platform_id ?? event.platform_id
        const groupKey = platformId == null
          ? `event-${index}`
          : `platform-${typeof platformId}-${String(platformId)}`
        const group = sourceGroups.get(groupKey)
        const sources = [...new Map(
          group.sources.map((source) => [source.url, source]),
        ).values()]

        return (
          <EventResult
            event={event}
            index={index}
            sources={sources}
            showSourceInfo={group.lastIndex === index}
            key={event.event_key || index}
          />
        )
      })}
    </div>
  )
}
