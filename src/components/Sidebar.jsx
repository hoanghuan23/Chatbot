import {
  Box,
  ChevronDown,
  MonitorUp,
  PanelLeftClose,
  Search,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import illuminatiLogo from '../image/seo.png'

const navigation = [
  { label: 'Knowledge Base', icon: Box },
  { label: 'Agents', icon: Sparkles },
  { label: 'Shared Spaces', icon: UsersRound },
]

export default function Sidebar({ isOpen, onClose, onNewChat }) {
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-header">
        <a className="wordmark" href="#" aria-label="cnnd home">
          <img className="wordmark-logo" src={illuminatiLogo} alt="" />
          <span className="wordmark-text">CNND</span>
        </a>
        <div className="sidebar-header-actions">
          <button type="button" aria-label="Search"><Search size={19} /></button>
          <button type="button" aria-label="Collapse sidebar"><PanelLeftClose size={19} /></button>
          <button className="mobile-close" type="button" aria-label="Close sidebar" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
      </div>

      <nav>
        <button className="new-chat-button" type="button" onClick={onNewChat}>
          <MonitorUp size={18} />
          <span>New Chat</span>
        </button>

        <div className="nav-links">
          {navigation.map(({ label, icon: Icon }) => (
            <button type="button" key={label} onClick={onClose}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <button className="profile-button" type="button">
        <span className="avatar">C</span>
        <span className="profile-copy">
          <strong>cnnd</strong>
          <small>cnnd@vccorp.vn</small>
        </span>
        <ChevronDown size={17} />
      </button>
    </aside>
  )
}
