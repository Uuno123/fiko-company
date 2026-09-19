import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import { CartProvider } from './lib/CartContext.jsx'
import { PartnerAuthProvider } from './lib/PartnerAuthContext.jsx'
import PartnerRoute from './components/PartnerRoute.jsx'
import ActiveOrderBubble from './components/ActiveOrderBubble.jsx'
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
import PartnerDashboard from './pages/PartnerDashboard.jsx'
import PreviewDashboard from './pages/__PreviewDashboard.jsx'
import PreviewAccount from './pages/__PreviewAccount.jsx'
import PreviewCart from './pages/__PreviewCart.jsx'

// React Router ei nollaa vieritystä sivunvaihdossa - ilman tätä esim. ravintolan sivulle
// PALATESSA (selaimen takaisin-painike tms.) sivu renderöityy edelliseen vieritysasentoon,
// jolloin Header luulee heti olevansa "scrollattu" ja näyttää tumman/kiinteän taustan sen
// läpinäkyvän hero-tilan sijaan.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
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
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/haku" element={<SearchResults />} />
            <Route path="/ravintola/:id" element={<RestaurantPage />} />
            <Route path="/kategoria/:slug" element={<CategoryPage />} />
            <Route path="/ostoskori" element={<Cart />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/asetukset" element={<Settings />} />
            <Route path="/asetukset/tiedot" element={<SettingsProfile />} />
            <Route path="/asetukset/salasana" element={<SettingsPassword />} />
            <Route path="/asetukset/maksutavat" element={<SettingsPayments />} />
            <Route path="/asetukset/ilmoitukset" element={<SettingsNotifications />} />
            <Route path="/omat-tilaukset" element={<OrderHistory />} />
            <Route path="/__preview-account" element={<PreviewAccount />} />
            <Route path="/__preview-cart" element={<PreviewCart />} />

            <Route
              element={
                <PartnerAuthProvider>
                  <Outlet />
                </PartnerAuthProvider>
              }
            >
              <Route path="/__preview-dashboard" element={<PreviewDashboard />} />
              <Route path="/kumppanina" element={<PartnerLanding />} />
              <Route path="/kumppani/kirjaudu" element={<PartnerLogin />} />
              <Route path="/kumppani/rekisteroidy" element={<PartnerRegister />} />
              <Route
                path="/kumppani/dashboard"
                element={
                  <PartnerRoute>
                    <PartnerDashboard />
                  </PartnerRoute>
                }
              />
            </Route>
          </Routes>
          <ActiveOrderBubble />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
