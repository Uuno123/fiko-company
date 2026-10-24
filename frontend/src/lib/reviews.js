import { supabase } from './supabaseClient.js'

// Ravintolan arvostelut (migraatio 0054). Lukeminen on julkista; kirjoittaminen
// kulkee submit_restaurant_review-funktion kautta, joka vaatii ravintolasta
// valmiin tilauksen. Yksi arvostelu per asiakas ja ravintola - uusi lähetys
// muokkaa vanhaa.

export const REVIEW_MAX_LENGTH = 500

export async function fetchReviews(restaurantId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('id, author_name, rating, comment, reply, created_at, updated_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

// { can_review, review: { rating, comment } | null } kirjautuneelle asiakkaalle.
export async function fetchMyReviewStatus(restaurantId) {
  const { data, error } = await supabase.rpc('my_review_status', { p_restaurant_id: restaurantId })
  if (error) throw error
  return data
}

export async function submitReview(restaurantId, rating, comment) {
  const { data, error } = await supabase.rpc('submit_restaurant_review', {
    p_restaurant_id: restaurantId,
    p_rating: rating,
    p_comment: comment,
  })
  if (error) throw error
  return data
}

// Kuljettajan arvio toimitetusta tilauksesta (migraatio 0062). Yksi per tilaus,
// uusi lähetys muokkaa sitä.
export async function submitCourierReview(orderId, stars, comment) {
  const { data, error } = await supabase.rpc('submit_courier_review', {
    p_order_id: orderId,
    p_stars: stars,
    p_comment: comment,
  })
  if (error) throw error
  return data
}

// { courier_name, photo_path, review } tai null (ei kuljettajan toimittama).
async function fetchCourierReviewStatus(orderId) {
  const { data, error } = await supabase.rpc('courier_review_status', { p_order_id: orderId })
  if (error) throw error
  return data
}

export function reviewErrorText(error) {
  const code = error?.code ?? ''
  const message = String(error?.message ?? '')
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(code)) return 'Arvostelut eivät ole vielä käytössä.'
  if (message.includes('review_requires_order')) return 'Voit arvostella ravintolan, kun olet tilannut sieltä.'
  if (message.includes('review_requires_delivery')) return 'Voit arvioida kuljettajan, kun tilaus on toimitettu.'
  if (message.includes('invalid_rating')) return 'Valitse 1–5 tähteä.'
  if (message.includes('comment_too_long')) return `Arvostelu voi olla enintään ${REVIEW_MAX_LENGTH} merkkiä.`
  if (message.includes('not_signed_in')) return 'Kirjaudu sisään arvostellaksesi.'
  return 'Arvostelun tallennus epäonnistui. Yritä hetken kuluttua uudelleen.'
}

// ── Arviointipyyntö (ReviewPrompt) ─────────────────────────────────────────
// Kun tilaus on toimitettu tai noudettu, asiakkaalta kysytään arviota kerran.
// Suljetut ja arvioidut tilaukset muistetaan selaimessa, ja pyyntö koskee vain
// viimeisen kolmen päivän tilauksia.
const PROMPT_HANDLED_KEY = 'delivo-review-prompt-handled'
const PROMPT_LOOKBACK_MS = 3 * 86_400_000

function loadHandledPrompts() {
  try {
    return JSON.parse(localStorage.getItem(PROMPT_HANDLED_KEY)) ?? []
  } catch {
    return []
  }
}

export function markReviewPromptHandled(...orderIds) {
  try {
    const handled = loadHandledPrompts().filter((id) => !orderIds.includes(id))
    localStorage.setItem(PROMPT_HANDLED_KEY, JSON.stringify([...orderIds, ...handled].slice(0, 50)))
  } catch {
    // Ei tallennustilaa - pyyntö voi näkyä uudelleen seuraavalla latauksella.
  }
}

function recentCompletedOrders(customerId, restaurantId) {
  let query = supabase
    .from('orders')
    .select(
      'id, order_number, restaurant_id, delivery_method, status, courier_status, delivered_at, updated_at, restaurants(name)',
    )
    .eq('customer_id', customerId)
    // Valmis = nouto noudettu, tai kotiinkuljetus perillä. Ravintolan "completed"
    // tarkoittaa kotiinkuljetuksessa vain luovutusta kuljettajalle - toimitus on
    // silloin vielä kesken (kysely avautui seurannan päälle kuljettajan ollessa
    // matkalla). Kuljettajaton kotiinkuljetus (ravintola vie itse) on valmis completed-tilassa.
    .or(
      'and(delivery_method.eq.pickup,status.eq.completed),courier_status.eq.delivered,and(delivery_method.eq.delivery,status.eq.completed,courier_id.is.null)',
    )
    .gte('updated_at', new Date(Date.now() - PROMPT_LOOKBACK_MS).toISOString())
    .order('updated_at', { ascending: false })
    .limit(5)
  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  return query
}

// Arvostelun jälkeen (ikkunasta tai pyynnöstä) saman ravintolan tuoreita
// tilauksia ei enää kysytä erikseen.
export async function markRestaurantOrdersReviewed(customerId, restaurantId) {
  if (!supabase || !customerId) return
  const { data } = await recentCompletedOrders(customerId, restaurantId)
  if (data?.length) markReviewPromptHandled(...data.map((order) => order.id))
}

// Uusin valmis tilaus, jota ei ole vielä kysytty. Pyyntö tulee jokaisesta
// tilauksesta - jos ravintola on jo arvosteltu, uusi arvio päivittää vanhan
// (yksi arvostelu per asiakas ja ravintola). hasReview kertoo tämän.
// null, jos sellaista ei ole tai arvostelut eivät ole käytössä (0054 ajamatta).
// Kesken oleva tilaus (sama rajaus kuin tilauskuplassa, ActiveOrderBubble).
const IN_PROGRESS_FILTER =
  'status.in.(awaiting_courier,pending,confirmed,preparing,ready),courier_status.in.(assigned,at_restaurant,picked_up)'

async function hasOrderInProgress(customerId) {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .neq('status', 'cancelled')
    .or(IN_PROGRESS_FILTER)
  return !error && count > 0
}

export async function findOrderToReview(customerId) {
  if (!supabase || !customerId) return null
  // Ei kysytä aiemmasta tilauksesta, kun uusi on vielä matkalla: kysely peitti
  // seurannan. Kun tilaus on perillä, kysytään siitä (uusin ensin).
  if (await hasOrderInProgress(customerId)) return null
  const { data, error } = await recentCompletedOrders(customerId)
  if (error || !data) return null
  const handled = loadHandledPrompts()
  const order = data.find((row) => !handled.includes(row.id))
  if (!order) return null
  try {
    const status = await fetchMyReviewStatus(order.restaurant_id)
    if (!status?.can_review) return null
    return { ...order, hasReview: Boolean(status.review), courier: await courierToReview(order) }
  } catch {
    return null
  }
}

// Kuljettajan toimittamasta tilauksesta kysytään myös kuljettajan arvio, ellei
// sitä ole jo annettu. null, jos ei kuljettajaa tai 0062 ajamatta.
async function courierToReview(order) {
  if (order.courier_status !== 'delivered') return null
  try {
    const status = await fetchCourierReviewStatus(order.id)
    return status && !status.review ? status : null
  } catch {
    return null
  }
}

// "tänään klo 18.40", "eilen klo 18.40" tai "20.10." - milloin arvioitava
// tilaus toimitettiin tai noudettiin.
export function finishedAtLabel(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const days = daysSince(iso)
  const time = date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
  if (days === 0) return `tänään klo ${time}`
  if (days === 1) return `eilen klo ${time}`
  return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })
}

// Montako päivää sitten (arvostelun ikä listassa, formatReviewAge).
export function daysSince(iso) {
  const start = new Date(iso)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((today - start) / 86_400_000)
}
