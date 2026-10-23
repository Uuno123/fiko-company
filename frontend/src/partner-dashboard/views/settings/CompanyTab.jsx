import { useRef, useState } from 'react'
import { FileText, FileUp } from 'lucide-react'
import { CHANGE_FIELDS, DOCUMENT_STATUS, DOCUMENT_TYPES, changeRequestErrorText, displayValue, maskIban } from '../../changeRequests.js'
import { useDashboard } from '../../context.js'
import { Badge, Card, EmptyState, ErrorNote, Field } from '../../ui.jsx'
import { formatDate } from '../../utils.js'
import { LockedField } from './ChangeRequestDrawer.jsx'

const REQUEST_STATUS = {
  pending: { label: 'Odottaa', tone: 'info' },
  approved: { label: 'Hyväksytty', tone: 'success' },
  rejected: { label: 'Hylätty', tone: 'danger' },
}

// Yritys- ja laskutustiedot (lukittuja, muutos pyynnöllä), dokumentit ja
// muutospyyntöjen historia.
export default function CompanyTab({ changes, onRequest }) {
  const { restaurant, toast } = useDashboard()
  const fileInput = useRef(null)
  const [docType, setDocType] = useState('business_register')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function upload(file) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return setError('Tiedosto on liian suuri (enintään 10 Mt)')
    setUploading(true)
    setError('')
    try {
      await changes.uploadDocument(docType, file)
      toast('Dokumentti lähetetty tarkastettavaksi')
    } catch (err) {
      setError(changeRequestErrorText(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="pd-two-col">
      <div className="pd-stack">
        <Card title="Yritys- ja maksutiedot" subtitle="Tilitykset maksetaan tälle tilille. Muutokset Bidropin hyväksynnällä.">
          {['company_name', 'business_id', 'iban'].map((field) => (
            <LockedField
              key={field}
              field={field}
              value={field === 'iban' ? maskIban(restaurant.iban) : restaurant[field]}
              pending={changes.pendingFor(field)}
              rejected={changes.rejectedFor(field)}
              onRequest={() => onRequest(field)}
            />
          ))}
        </Card>

        <Card title="Muutospyynnöt" subtitle="Lähettämäsi pyynnöt ja niiden tila" padded={false}>
          {changes.requests.length === 0 ? (
            <EmptyState title="Ei muutospyyntöjä" text="Pyydä muutosta lukitun tiedon kohdalta." />
          ) : (
            <ul className="pd-list pd-list--padded">
              {changes.requests.map((r) => (
                <li key={r.id}>
                  <span>
                    <strong>
                      {CHANGE_FIELDS[r.field]?.label ?? r.field}: {displayValue(r.field, r.new_value)}
                    </strong>
                    <span className="pd-muted">
                      {formatDate(r.created_at)}
                      {r.admin_note ? ` · ${r.admin_note}` : ''}
                    </span>
                  </span>
                  <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Dokumentit" subtitle="Kuvat ja PDF:t näkevät vain sinä ja Bidrop">
        {changes.documents.length > 0 ? (
          <ul className="pd-list">
            {changes.documents.map((d) => (
              <li key={d.id}>
                <FileText size={18} strokeWidth={1.75} aria-hidden="true" className="pd-muted" />
                <span>
                  <strong>{DOCUMENT_TYPES[d.type] ?? d.type}</strong>
                  <span className="pd-muted">
                    {formatDate(d.created_at)}
                    {d.change_request_id ? ' · muutospyynnön liite' : ''}
                    {d.status === 'rejected' && d.admin_note ? ` · ${d.admin_note}` : ''}
                  </span>
                </span>
                <Badge tone={DOCUMENT_STATUS[d.status].tone}>{DOCUMENT_STATUS[d.status].label}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pd-muted">Ei vielä dokumentteja.</p>
        )}

        <div className="pd-subform">
          <Field label="Lisää dokumentti">
            <select className="pd-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <button type="button" className="pd-dropzone" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <FileUp size={20} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>{uploading ? 'Lähetetään…' : 'Valitse tiedosto ja lähetä'}</strong>
              <span className="pd-muted">Kuva tai PDF, enintään 10 Mt</span>
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Card>
    </div>
  )
}
