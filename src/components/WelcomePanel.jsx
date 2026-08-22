import { RefreshCw } from 'lucide-react'

const suggestions = [
  'Tin mới nhất về bão số 4?',
  'Hà Nội có các sự kiện nào trong 24h qua',
  'đội tuyển bóng đá Việt Nam',
  'Dự báo thời tiết hôm nay',
  'Sự kiện đang được quan tâm',
]

export default function WelcomePanel({ onSuggestionSelect }) {
  return (
    <section className="welcome-panel" aria-labelledby="welcome-title">
      <h1 id="welcome-title">Hi, I am Hot search — your knowledge, within reach.</h1>
      <div className="ask-me">
        <span>You can ask me</span>
        <RefreshCw size={14} />
      </div>
      <div className="suggestions" aria-label="Suggested questions">
        {suggestions.map((suggestion) => (
          <button type="button" key={suggestion} onClick={() => onSuggestionSelect(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}
