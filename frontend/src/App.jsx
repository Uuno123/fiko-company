import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import { CartProvider } from './lib/CartContext.jsx'
import { PartnerAuthProvider } from './lib/PartnerAuthContext.jsx'
import PartnerRoute from './components/PartnerRoute.jsx'
import Home from './pages/Home.jsx'
import RestaurantPage from './pages/RestaurantPage.jsx'
import Cart from './pages/Cart.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import PartnerLanding from './pages/PartnerLanding.jsx'
import PartnerLogin from './pages/PartnerLogin.jsx'
import PartnerRegister from './pages/PartnerRegister.jsx'
import PartnerDashboard from './pages/PartnerDashboard.jsx'
import PreviewDashboard from './pages/__PreviewDashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ravintola/:id" element={<RestaurantPage />} />
            <Route path="/ostoskori" element={<Cart />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
