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
const PLATFORM_ID_KEYS = ['platform_id', 'platformId']

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

function firstIdentifier(record, keys) {
  return keys.map((key) => record?.[key]).find((value) => (
    (typeof value === 'string' && value.trim()) || typeof value === 'number'
  ))
}

function collectLinks(value, context = {}, links = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return links
  seen.add(value)

  const localContext = {
    postedAt: firstValue(value, DATE_KEYS) || context.postedAt,
    source: firstValue(value, SOURCE_KEYS) || context.source,
    platformId: firstIdentifier(value, PLATFORM_ID_KEYS) ?? context.platformId,
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

function platformIdFromResult(result, links) {
  const event = result?.event && typeof result.event === 'object' ? result.event : result
  const properties = event?.properties && typeof event.properties === 'object' ? event.properties : event

  return firstIdentifier(properties, PLATFORM_ID_KEYS)
    ?? firstIdentifier(event, PLATFORM_ID_KEYS)
    ?? firstIdentifier(result, PLATFORM_ID_KEYS)
    ?? links.find((link) => link.platformId != null)?.platformId
}

export function getEventSources(results) {
  if (!Array.isArray(results)) return []

  const events = []
  results.forEach((result, index) => {
    if (!result || typeof result !== 'object') return
    const links = collectLinks(result)
    if (!links.length) return

    events.push({
      key: eventKey(result, index),
      links,
      platformId: platformIdFromResult(result, links),
      sourcePosition: events.length,
    })
  })

  const groups = new Map()
  events.forEach((event) => {
    const key = event.platformId == null
      ? event.key
      : `platform-${typeof event.platformId}-${String(event.platformId)}`
    const group = groups.get(key) || { events: [], links: [] }
    group.events.push(event)
    group.links.push(...event.links)
    groups.set(key, group)
  })

  return [...groups.values()].map((group) => {
    const { events: groupedEvents, links } = group
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
      sourcePositions: groupedEvents.map((event) => event.sourcePosition),
      isSharedPlatform: groupedEvents.length > 1 && groupedEvents[0].platformId != null,
    }
  }).filter(Boolean)
}
