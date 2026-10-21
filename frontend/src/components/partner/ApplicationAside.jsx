// Hakemussivujen sivukortti (ravintolan ja kuljettajan hakemus): mitä hakemuksen
// jälkeen tapahtuu ja tärkeimmät luvut. Tyylit PartnerApplication.css:ssä.
function ApplicationAside({ eyebrow, title, steps, facts }) {
  return (
    <aside className="application-aside" aria-label={title}>
      <p className="application-aside__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <ol className="application-aside__steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="application-aside__num">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <ul className="application-aside__facts">
        {facts.map((fact) => (
          <li key={fact.label}>
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default ApplicationAside
