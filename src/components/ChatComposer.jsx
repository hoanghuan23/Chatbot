import { useRef, useState } from 'react'
import { AtSign, ChevronDown, Paperclip, Send } from 'lucide-react'

export default function ChatComposer({ value, onChange, onSend, isSending = false }) {
  const [workspace, setWorkspace] = useState('CNND')
  const [model, setModel] = useState('Gemini 3.1 Flash-Lite')
  const fileInputRef = useRef(null)

  const submit = () => {
    if (!isSending && value.trim()) onSend(value)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="composer" aria-label="Chat composer" aria-busy={isSending}>
      <textarea
        aria-label="Message"
        placeholder="Uses wiki pages for navigation and context, then drills into chunks for precise quotes. Requires KBs with BOTH Wiki and chunk indexing."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
      />

      <div className="composer-toolbar">
        <div className="composer-tools">
          <label className="select-control">
            <span className="sr-only">Workspace</span>
            <select value={workspace} onChange={(event) => setWorkspace(event.target.value)}>
              <option>CNND</option>
              <option>SOHA</option>
              <option>VCCORP</option>
            </select>
            <ChevronDown size={14} />
          </label>

          <input ref={fileInputRef} className="sr-only" type="file" />
          <button type="button" aria-label="Attach file" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={20} />
          </button>
          <button type="button" aria-label="Mention someone" onClick={() => onChange(`${value}@`)}>
            <AtSign size={20} />
          </button>
        </div>

        <div className="send-tools">
          <label className="select-control model-select">
            <span className="sr-only">Model</span>
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              <option>Gemini 3.1 Flash-Lite</option>
              <option>Gemini 3.5 Flash-Lite</option>
              <option>gpt-4.1-mini</option>
            </select>
            <ChevronDown size={14} />
          </label>
          <button
            className="send-button"
            type="button"
            aria-label="Send message"
            disabled={isSending || !value.trim()}
            onClick={submit}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}
