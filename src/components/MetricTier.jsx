export default function MetricTier({ tier }) {
  if (tier !== 'hot' && tier !== 'warm') return null

  return (
    <span className="metric-tier">
      {tier === 'hot' ? '🔥 Hot' : '🌟 Warm'}
    </span>
  )
}
