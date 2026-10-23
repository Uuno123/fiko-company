import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import { CartProvider } from './lib/CartContext.jsx'
import { PartnerAuthProvider } from './lib/PartnerAuthContext.jsx'
import PartnerRoute from './components/PartnerRoute.jsx'
import ActiveOrderBubble from './components/ActiveOrderBubble.jsx'
import ReviewPrompt from './components/ReviewPrompt.jsx'
import CookieConsent from './components/CookieConsent.jsx'
import AddressGate from './components/AddressGate.jsx'
import BottomSheet from './components/BottomSheet.jsx'
import { useIsMobile } from './lib/useIsMobile.js'
import Home from './pages/Home.jsx'
import SearchResults from './pages/SearchResults.jsx'
import RestaurantPage from './pages/RestaurantPage.jsx'
import CategoryPage from './pages/CategoryPage.jsx'
import Cart from './pages/Cart.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Settings from './pages/Settings.jsx'
import SettingsProfile from './pages/SettingsProfile.jsx'
import SettingsPassword from './pages/SettingsPassword.jsx'
import SettingsPayments from './pages/SettingsPayments.jsx'
import SettingsNotifications from './pages/SettingsNotifications.jsx'
import OrderHistory from './pages/OrderHistory.jsx'
import PartnerLanding from './pages/PartnerLanding.jsx'
import PartnerLogin from './pages/PartnerLogin.jsx'
import PartnerRegister from './pages/PartnerRegister.jsx'
import CourierApplication from './pages/CourierApplication.jsx'
import PartnerDashboard from './partner-dashboard/PartnerDashboard.jsx'
import PreviewDashboard from './pages/__PreviewDashboard.jsx'
import PreviewAccount from './pages/__PreviewAccount.jsx'
import PreviewCart from './pages/__PreviewCart.jsx'
import PreviewTracking from './pages/__PreviewTracking.jsx'

// React Router ei nollaa vieritystä sivunvaihdossa - ilman tätä esim. ravintolan sivulle
// PALATESSA (selaimen takaisin-painike tms.) sivu renderöityy edelliseen vieritysasentoon,
// jolloin Header luulee heti olevansa "scrollattu" ja näyttää tumman/kiinteän taustan sen
// läpinäkyvän hero-tilan sijaan. Kirjautumispaneelin avaaminen ja sulkeminen ei vaihda
// taustalla näkyvää sivua, joten se ei vieritä.
function ScrollToTop({ pathname }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const HOME_LOCATION = { pathname: '/', search: '', hash: '', state: null, key: 'auth-home' }
const AUTH_PATHS = ['/login', '/register']
// Sama raja kuin BottomSheet.css:ssä.
const PHONE_QUERY = '(max-width: 639px)'

// Työpöydällä kirjautuminen ja rekisteröinti ovat omia sivujaan.
function AuthPage({ children }) {
  return (
    <div className="page">
      <main className="auth-page auth-page--full-height">{children}</main>
    </div>
  )
}

// Puhelimella /login ja /register ovat alhaalta liukuva paneeli sen sivun
// päällä, jolta kirjautumaan lähdettiin (käyttäjän pyyntö 23.10.2026;
// työpöydällä koko sivu on hyvä). Taustalla pysyy viimeisin muu sivu; jos
// paneeli avattiin suoraan osoitteesta (esim. sähköpostin vahvistuslinkki) tai
// sivu vaatii kirjautumisen (state.overHome, muuten se ohjaisi taas tänne),
// taustalla on etusivu. Puhelimen takaisin-ele sulkee paneelin, koska se on oma
// historiamerkintänsä. Kirjautumisesta rekisteröintiin vaihdetaan samassa
// paneelissa (replace).
function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const phone = useIsMobile(PHONE_QUERY)
  const isAuth = AUTH_PATHS.includes(location.pathname)
  const isSheet = isAuth && phone
  const [lastPage, setLastPage] = useState(isAuth ? null : location)
  if (!isAuth && lastPage !== location) setLastPage(location)
  const overPage = isSheet && lastPage != null && !location.state?.overHome && window.history.state?.idx > 0
  const pageLocation = isSheet ? (overPage ? lastPage : HOME_LOCATION) : location

  function closeSheet() {
    if (overPage) navigate(-1)
    else navigate('/', { replace: true })
  }

  // Kirjautumisen jälkeen takaisin sivulle, jonka päällä paneeli oli.
  function finishLogin(redirectTo) {
    if (overPage) navigate(-1)
    else navigate(redirectTo, { replace: true })
  }

  const authContent = location.pathname === '/login' ? <Login onDone={finishLogin} /> : <Register />

  return (
    <>
      <ScrollToTop pathname={pageLocation.pathname} />
      <Routes location={pageLocation}>
        <Route path="/" element={<Home />} />
        <Route path="/haku" element={<SearchResults />} />
        <Route path="/ravintola/:id" element={<RestaurantPage />} />
        <Route path="/kategoria/:slug" element={<CategoryPage />} />
        <Route path="/ostoskori" element={<Cart />} />
        <Route path="/login" element={<AuthPage>{authContent}</AuthPage>} />
        <Route path="/register" element={<AuthPage>{authContent}</AuthPage>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/asetukset" element={<Settings />} />
        <Route path="/asetukset/tiedot" element={<SettingsProfile />} />
        <Route path="/asetukset/salasana" element={<SettingsPassword />} />
        <Route path="/asetukset/maksutavat" element={<SettingsPayments />} />
        <Route path="/asetukset/ilmoitukset" element={<SettingsNotifications />} />
        <Route path="/omat-tilaukset" element={<OrderHistory />} />
        <Route path="/__preview-account" element={<PreviewAccount />} />
        <Route path="/__preview-cart" element={<PreviewCart />} />
        <Route path="/__preview-tracking" element={<PreviewTracking />} />

        <Route
          element={
            <PartnerAuthProvider>
              <Outlet />
            </PartnerAuthProvider>
          }
        >
          <Route path="/__preview-dashboard/*" element={<PreviewDashboard />} />
          <Route path="/kumppanina" element={<PartnerLanding />} />
          <Route path="/kumppani/kirjaudu" element={<PartnerLogin />} />
          <Route path="/kumppani/rekisteroidy" element={<PartnerRegister />} />
          <Route path="/kumppani/kuljettajaksi" element={<CourierApplication />} />
          <Route
            path="/kumppani/dashboard/*"
            element={
              <PartnerRoute>
                <PartnerDashboard />
              </PartnerRoute>
            }
          />
        </Route>
      </Routes>
      {isSheet && (
        <BottomSheet onClose={closeSheet} labelledBy="auth-title">
          {authContent}
        </BottomSheet>
      )}
    </>
  )
}

function App() {
  useEffect(() => {
    // Sivulla ei ole yhtään laillista syytä koko dokumentin vaakavieritykselle -
    // kaikki vaakasuunnassa vierivät rivit (kategoriat, lisäostosuositukset...) ovat
    // omia overflow-x:auto -säiliöitään. Silti esim. Stripen Link-integraatio
    // maksuvaiheessa asentaa oman kelluvan ikkunansa suoraan <body>:n alle, sivun
    // React-puun ulkopuolelle, emmekä voi rajata sitä minkään konttiemme CSS:llä.
    // Jos se (tai joku muu 3. osapuolen upotus) fokusoi piilotetun/reunan
    // ulkopuolella olevan elementin, selain vierittää koko sivua näyttääkseen sen -
    // tämä ohittaa html/body:n overflow-x:hidden:in, koska se estää vain
    // käyttäjän oman vieritysyrityksen, ei ohjelmallista scrollIntoView'ta.
    // Nollataan vaakavieritys heti jos jokin pakottaa sen, sen sijaan että
    // yritettäisiin arvata etukäteen mikä upotus sen aiheuttaa.
    function resetHorizontalScroll() {
      if (window.scrollX !== 0) window.scrollTo(0, window.scrollY)
    }
    window.addEventListener('scroll', resetHorizontalScroll, { passive: true })
    return () => window.removeEventListener('scroll', resetHorizontalScroll)
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <ActiveOrderBubble />
          <ReviewPrompt />
          <CookieConsent />
          <AddressGate />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
