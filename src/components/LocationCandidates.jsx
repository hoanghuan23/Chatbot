import { ExternalLink, MapPin } from 'lucide-react'
import { formatVietnameseDateTime } from '../utils/dateTime'
import MetricTier from './MetricTier'

function sourceUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function SourceReference({ source, index }) {
  const name = source.source_name?.trim() || source.post_platform
  const label = name || `Bài viết ${index + 1}`
  const postedAt = formatVietnameseDateTime(source.posted_at)
  const content = <><span>{label}</span>{postedAt && <time>{postedAt}</time>}<MetricTier tier={source.metric_tier} /></>
  const url = sourceUrl(source.post_url)
  return url
    ? <a title={source.post_content || undefined} href={url} target="_blank" rel="noopener noreferrer" className="location-source-reference">{content} <ExternalLink size={12} aria-hidden="true" /></a>
    : <span className="location-source-reference" title={source.post_content || 'Chưa có liên kết bài viết'}>{content}</span>
}

export default function LocationCandidates({ events }) {
  const items = Array.isArray(events) ? events : []
  if (!items.length) return <p className="location-empty">Không tìm thấy sự kiện phù hợp.</p>

  return (
    <section className="location-results" aria-label="Địa điểm theo sự kiện">
      <h3><MapPin size={17} aria-hidden="true" /> Địa điểm theo sự kiện</h3>
      <p className="location-notice">Đây là các địa điểm được nhắc trong bài viết, chưa xác nhận nơi sự kiện xảy ra. Hãy đối chiếu nội dung và nguồn bài viết.</p>
      <p className="location-count">{items.length} sự kiện trong kết quả</p>
      {items.map((event, index) => {
        const sources = Array.isArray(event.sources) ? event.sources : []
        const locations = Array.isArray(event.locations) ? event.locations : []
        return (
          <section className="location-event" key={event.event_key} aria-label={`Sự kiện ${index + 1}`}>
            <h4 className="location-description">{event.event_description || event.event_key}</h4>
            {event.location_status === 'unknown' && <p className="location-empty">Chưa có địa điểm được ghi nhận cho sự kiện</p>}
            {locations.length > 0 && <>
              <h5 className="location-label">Địa điểm được nhắc tới</h5>
              <ul className="location-paths">
                {locations.map((location, locationIndex) => (
                  <li className="location-place" key={locationIndex}>
                    <div className="location-chain">{Array.isArray(location.location_chain) && location.location_chain.length
                      ? location.location_chain.join(' → ')
                      : location.mentioned_location}</div>
                  </li>
                ))}
              </ul>
            </>}
            <details className="location-content">
              <summary>Bài viết nguồn ({sources.length})</summary>
              <ul className="location-source-list">
                {sources.map((source, sourceIndex) => (
                  <li key={source.source_id ?? sourceIndex}>
                    <SourceReference source={source} index={sourceIndex} />
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )
      })}
    </section>
  )
}
