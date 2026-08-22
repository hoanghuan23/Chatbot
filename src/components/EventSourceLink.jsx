import { ExternalLink } from 'lucide-react'

export default function EventSourceLink({ source }) {
  return (
    <a
      className="event-source-link"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Mở bài viết gốc trên ${source.label}`}
      title="Mở bài viết gốc"
    >
      <ExternalLink size={12} aria-hidden="true" />
      <span>{source.label}</span>
      <span className="event-source-count">+{source.count}</span>
    </a>
  )
}
