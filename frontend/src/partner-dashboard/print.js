import { formatDateTime, formatPrice, lineTotalCents, restaurantShareCents } from './utils.js'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Tilauslappu keittiöön tai kuittitulostimelle: kapea (80 mm) yksinkertainen
// asettelu. Tulostetaan piilotetun iframen kautta, jottei ponnahdusikkunaesto estä.
export function printOrderTicket(order, restaurantName) {
  const isDelivery = order.delivery_method === 'delivery'
  const lines = (order.order_items ?? [])
    .map(
      (line) => `
      <tr>
        <td class="qty">${line.quantity}×</td>
        <td>${escapeHtml(line.name)}${
          line.selected_options?.length
            ? `<div class="opt">${escapeHtml(line.selected_options.map((o) => o.name).join(', '))}</div>`
            : ''
        }</td>
        <td class="price">${escapeHtml(formatPrice(lineTotalCents(line)))}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html><html lang="fi"><head><meta charset="utf-8"><title>${escapeHtml(order.order_number)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #000; margin: 0; }
    h1 { font-size: 22px; margin: 0 0 2px; }
    .big { font-size: 16px; font-weight: 700; margin: 6px 0; text-transform: uppercase; }
    .muted { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td { padding: 3px 0; vertical-align: top; }
    .qty { width: 28px; font-weight: 700; }
    .price { text-align: right; white-space: nowrap; }
    .opt { font-size: 11px; color: #333; }
    .note { border: 1px solid #000; padding: 6px; margin: 8px 0; font-weight: 600; }
    .row { display: flex; justify-content: space-between; }
    hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  </style></head><body>
    <div class="muted">${escapeHtml(restaurantName)}</div>
    <h1>${escapeHtml(order.order_number)}</h1>
    <div class="muted">${escapeHtml(formatDateTime(order.created_at))}</div>
    <div class="big">${isDelivery ? 'Kotiinkuljetus' : 'Nouto'}</div>
    <div>${escapeHtml(order.delivery_name ?? '')} ${escapeHtml(order.delivery_phone ?? '')}</div>
    ${isDelivery && order.delivery_address ? `<div>${escapeHtml(order.delivery_address)}</div>` : ''}
    ${order.delivery_notes ? `<div class="note">${escapeHtml(order.delivery_notes)}</div>` : ''}
    <hr><table>${lines}</table><hr>
    <div class="row"><strong>Ravintolalle</strong><strong>${escapeHtml(formatPrice(restaurantShareCents(order)))}</strong></div>
  </body></html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)
  frame.contentDocument.open()
  frame.contentDocument.write(html)
  frame.contentDocument.close()
  frame.contentWindow.focus()
  frame.contentWindow.print()
  setTimeout(() => frame.remove(), 1000)
}
