import { ChevronDown } from 'lucide-react'

// Usein kysytyt kysymykset avattavana listana (<details>): selkeä ja toimii
// ilman JavaScriptiä. items: [{ q, a }].
function Faq({ title, items }) {
  return (
    <div className="ps-faq">
      <h2 className="ps-h2">{title}</h2>
      <div className="ps-faq__list">
        {items.map((item) => (
          <details key={item.q} className="ps-faq__item">
            <summary>
              <span>{item.q}</span>
              <ChevronDown size={20} strokeWidth={2.2} aria-hidden="true" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}

export default Faq
