import { ExternalLink } from 'lucide-react'

const URL_KEYS = new Set([
  'url',
  'urls',
  'link',
  'links',
  'permalink',
  'post_url',
  'post_urls',
  'postUrl',
  'postUrls',
  'source_url',
  'source_urls',
  'sourceUrl',
  'sourceUrls',
  'original_url',
  'originalUrl',
])

const DATE_KEYS = ['posted_at', 'postedAt', 'published_at', 'publishedAt', 'created_at', 'createdAt']
const SOURCE_KEYS = ['source', 'publisher', 'site', 'platform', 'domain']

function asSafeUrl(value) {
  if (typeof value !== 'string') return null

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

function firstValue(record, keys) {
  return keys.map((key) => record?.[key]).find((value) => typeof value === 'string' && value)
}

function collectLinks(value, context = {}, links = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return links
  seen.add(value)

  const localContext = {
    postedAt: firstValue(value, DATE_KEYS) || context.postedAt,
    source: firstValue(value, SOURCE_KEYS) || context.source,
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectLinks(item, localContext, links, seen))
    return links
  }

  Object.entries(value).forEach(([key, item]) => {
    if (URL_KEYS.has(key)) {
      const values = Array.isArray(item) ? item : [item]
      values.forEach((candidate) => {
        const url = asSafeUrl(candidate)
        if (url) links.push({ url, ...localContext })
        else collectLinks(candidate, localContext, links, seen)
      })
      return
    }

    collectLinks(item, localContext, links, seen)
  })

  return links
}

function sourceName(source, url) {
  if (source && !asSafeUrl(source)) return source

  const hostname = new URL(url).hostname.replace(/^www\./, '')
  const knownSources = {
    'vnexpress.net': 'VnExpress',
    'soha.vn': 'Soha',
    'tuoitre.vn': 'Tuổi Trẻ',
    'thanhnien.vn': 'Thanh Niên',
    'dantri.com.vn': 'Dân trí',
  }

  return knownSources[hostname] || hostname
}

function eventKey(result, index) {
  const event = result?.event && typeof result.event === 'object' ? result.event : result
  const properties = event?.properties && typeof event.properties === 'object' ? event.properties : event
  const identity = properties?.event_id
    ?? properties?.eventId
    ?? event?.elementId
    ?? properties?.id
  return identity == null ? `result-${index}` : `event-${identity}`
}

export function getEventSources(results) {
  if (!Array.isArray(results)) return []

  const groups = new Map()
  results.forEach((result, index) => {
    if (!result || typeof result !== 'object') return
    const key = eventKey(result, index)
    const current = groups.get(key) || []
    current.push(...collectLinks(result))
    groups.set(key, current)
  })

  return [...groups.values()].map((links) => {
    const uniqueLinks = [...new Map(links.map((link) => [link.url, link])).values()]
    if (!uniqueLinks.length) return null

    const latest = uniqueLinks.reduce((selected, link) => {
      const selectedTime = Date.parse(selected.postedAt || '')
      const linkTime = Date.parse(link.postedAt || '')
      return !Number.isNaN(linkTime) && (Number.isNaN(selectedTime) || linkTime > selectedTime)
        ? link
        : selected
    })

    return {
      ...latest,
      count: uniqueLinks.length,
      label: sourceName(latest.source, latest.url),
    }
  }).filter(Boolean)
}

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
