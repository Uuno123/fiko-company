import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp, X } from 'lucide-react'

export function DemoTag() {
  return (
    <span className="pd-demo-tag" title="Tämä osio käyttää esimerkkidataa - oikea data tulee kun ominaisuus kytketään tietokantaan.">
      Esimerkkidata
    </span>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <header className="pd-page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="pd-page-header__actions">{actions}</div>}
    </header>
  )
}

export function Card({ title, subtitle, action, demo, className = '', children, padded = true }) {
  return (
    <section className={`pd-card${padded ? '' : ' pd-card--flush'} ${className}`}>
      {(title || action) && (
        <div className="pd-card__head">
          <div className="pd-card__titles">
            {title && (
              <h2>
                {title}
                {demo && <DemoTag />}
              </h2>
            )}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action && <div className="pd-card__action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Delta({ value, suffix = 'edelliseen', invert = false }) {
  if (value == null) return <span className="pd-delta pd-delta--neutral">Uusi</span>
  const good = invert ? value <= 0 : value >= 0
  const Icon = value >= 0 ? TrendingUp : TrendingDown
  return (
    <span className={`pd-delta${good ? ' pd-delta--good' : ' pd-delta--bad'}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
      {Math.abs(value)} % {suffix}
    </span>
  )
}

export function Stat({ label, value, delta, deltaInvert, deltaSuffix, hint }) {
  return (
    <div className="pd-stat">
      <span className="pd-stat__label">{label}</span>
      <strong className="pd-stat__value">{value}</strong>
      {delta !== undefined && <Delta value={delta} invert={deltaInvert} suffix={deltaSuffix} />}
      {hint && <span className="pd-stat__hint">{hint}</span>}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`pd-badge pd-badge--${tone}`}>{children}</span>
}

export function Segmented({ options, value, onChange, size = 'md', label }) {
  return (
    <div className={`pd-segmented pd-segmented--${size}`} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count != null && <span className="pd-segmented__count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`pd-toggle${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="pd-toggle__thumb" />
    </button>
  )
}

// as="div" kun sisällä on nappeja: <label> klikkaus painaisi ensimmäistä nappia.
export function Field({ label, hint, error, children, className = '', as: Tag = 'label' }) {
  return (
    <Tag className={`pd-field ${className}`}>
      <span className="pd-field__label">{label}</span>
      {children}
      {error ? <span className="pd-field__error">{error}</span> : hint && <span className="pd-field__hint">{hint}</span>}
    </Tag>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="pd-empty">
      {Icon && (
        <span className="pd-empty__icon">
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <p className="pd-error" role="alert">
      {children}
    </p>
  )
}

function useEscape(onClose) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])
}

export function Drawer({ title, subtitle, onClose, children, footer, wide = false }) {
  useEscape(onClose)
  return (
    <div className="pd-overlay" onClick={onClose}>
      <aside
        className={`pd-drawer${wide ? ' pd-drawer--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pd-drawer__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="pd-icon-btn" aria-label="Sulje" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="pd-drawer__body">{children}</div>
        {footer && <footer className="pd-drawer__foot">{footer}</footer>}
      </aside>
    </div>
  )
}

export function Modal({ title, onClose, children, footer }) {
  useEscape(onClose)
  return (
    <div className="pd-overlay pd-overlay--center" onClick={onClose}>
      <div className="pd-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="pd-modal__head">
          <h2>{title}</h2>
          <button type="button" className="pd-icon-btn" aria-label="Sulje" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="pd-modal__body">{children}</div>
        {footer && <footer className="pd-modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

// Pylväskaavio ilman kirjastoa: arvot skaalataan suurimpaan, korostettu pylväs
// (esim. tämä päivä) mustana ja muut harmaina.
export function BarChart({ data, formatValue = (v) => v, height = 200 }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="pd-chart" style={{ height }}>
      <div className="pd-chart__bars">
        {data.map((d) => (
          <div key={d.key ?? d.label} className="pd-chart__col">
            <div className="pd-chart__track">
              <div
                className={`pd-chart__bar${d.highlight ? ' is-highlight' : ''}`}
                style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
              >
                <span className="pd-chart__tip">{formatValue(d.value)}</span>
              </div>
            </div>
            <span className="pd-chart__label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const show = useCallback((text, tone = 'default') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, text, tone }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pd-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pd-toast pd-toast--${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
