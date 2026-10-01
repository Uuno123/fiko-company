import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Clock,
  History,
  Home,
  LifeBuoy,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Settings,
  Star,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wallet,
  WifiOff,
} from 'lucide-react'
import { usePartnerAuth } from '../lib/PartnerAuthContext.jsx'
import { useDashboardApi } from './api.js'
import { DashboardContext } from './context.js'
import {
  isAudioUnlocked,
  playChime,
  unlockAudio,
  useDeviceSettings,
  useOnline,
  useOrderAlarm,
  useOrders,
  useWakeLock,
} from './hooks.js'
import StoreStatus, { useStoreStatus } from './StoreStatus.jsx'
import { EmptyState, ToastProvider, useToast } from './ui.jsx'
import { storageGet, storageSet } from './utils.js'
import HomeView from './views/HomeView.jsx'
import OrdersView from './views/OrdersView.jsx'
import HistoryView from './views/HistoryView.jsx'
import MenuView from './views/MenuView.jsx'
import AvailabilityView from './views/AvailabilityView.jsx'
import ReviewsView from './views/ReviewsView.jsx'
import MarketingView from './views/MarketingView.jsx'
import StatsView from './views/StatsView.jsx'
import FinanceView from './views/FinanceView.jsx'
import SettingsView from './views/SettingsView.jsx'
import SupportView from './views/SupportView.jsx'
import './dashboard.css'

const NAV = [
  { path: '', label: 'Koti', icon: Home },
  { path: 'tilaukset', label: 'Tilaukset', icon: ClipboardList, showPending: true },
  { path: 'historia', label: 'Historia', icon: History },
  { path: 'ruokalista', label: 'Ruokalista', icon: UtensilsCrossed },
  { path: 'saatavuus', label: 'Saatavuus', icon: Clock },
  { path: 'arviot', label: 'Arviot', icon: Star },
  { path: 'markkinointi', label: 'Markkinointi', icon: Megaphone },
  { path: 'tilastot', label: 'Tilastot', icon: BarChart3 },
  { path: 'talous', label: 'Talous', icon: Wallet },
  { path: 'asetukset', label: 'Asetukset', icon: Settings, bottom: true },
  { path: 'tuki', label: 'Tuki', icon: LifeBuoy, bottom: true },
]

// Puhelimen alapalkissa neljä tärkeintä, loput "Lisää"-valikossa.
const MOBILE_PRIMARY = ['', 'tilaukset', 'ruokalista', 'tilastot']

function navHref(basePath, path) {
  return path ? `${basePath}/${path}` : basePath
}

function RestaurantAvatar({ restaurant, size = 36 }) {
  return restaurant.image_url ? (
    <img className="pd-avatar" src={restaurant.image_url} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="pd-avatar pd-avatar--initial" style={{ width: size, height: size }} aria-hidden="true">
      {restaurant.name?.trim()?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function AccountMenu({ restaurant, restaurants, onSelect, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="pd-account" ref={ref}>
      <button
        type="button"
        className="pd-account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <RestaurantAvatar restaurant={restaurant} size={34} />
        <span className="pd-account__name">
          <strong>{restaurant.name}</strong>
          <span>{restaurant.city || restaurant.category}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="pd-menu pd-account__menu" role="menu">
          {restaurants.length > 1 && (
            <>
              <span className="pd-menu__label">Vaihda ravintolaa</span>
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="menuitem"
                  className={r.id === restaurant.id ? 'is-active' : ''}
                  onClick={() => {
                    onSelect(r.id)
                    setOpen(false)
                  }}
                >
                  <RestaurantAvatar restaurant={r} size={22} /> {r.name}
                </button>
              ))}
              <span className="pd-menu__divider" />
            </>
          )}
          <button type="button" role="menuitem" onClick={onSignOut}>
            <LogOut size={16} aria-hidden="true" /> Kirjaudu ulos
          </button>
        </div>
      )}
    </div>
  )
}

function SoundButton({ settings, updateSettings, pendingCount }) {
  const [unlocked, setUnlocked] = useState(isAudioUnlocked())

  // Ensimmäinen napautus missä tahansa avaa äänet - selain ei salli ääntä ennen sitä.
  useEffect(() => {
    if (unlocked) return undefined
    function handleFirstGesture() {
      setUnlocked(unlockAudio())
    }
    document.addEventListener('pointerdown', handleFirstGesture)
    return () => document.removeEventListener('pointerdown', handleFirstGesture)
  }, [unlocked])

  const on = settings.sound
  return (
    <button
      type="button"
      className={`pd-topbar__icon${on ? '' : ' is-muted'}${pendingCount > 0 && on ? ' is-ringing' : ''}`}
      aria-label={on ? 'Mykistä uusien tilausten äänimerkki' : 'Ota uusien tilausten äänimerkki käyttöön'}
      title={on ? (unlocked ? 'Äänimerkit päällä' : 'Napauta kerran ottaaksesi äänet käyttöön') : 'Äänimerkit pois'}
      onClick={() => {
        const next = !on
        updateSettings({ sound: next })
        if (next) {
          setUnlocked(unlockAudio())
          playChime(settings.volume)
        }
      }}
    >
      {on ? <Volume2 size={19} aria-hidden="true" /> : <VolumeX size={19} aria-hidden="true" />}
      {on && !unlocked && <span className="pd-topbar__hint-dot" aria-hidden="true" />}
    </button>
  )
}

function Shell({ basePath, restaurants, signOut, refreshRestaurants }) {
  const api = useDashboardApi()
  const toast = useToast()
  const [activeId, setActiveId] = useState(() => storageGet('pd-active-restaurant', null))
  const [overrides, setOverrides] = useState({})
  const [moreOpen, setMoreOpen] = useState(false)
  const [settings, updateSettings] = useDeviceSettings()
  const online = useOnline()

  const baseRestaurant = restaurants.find((r) => r.id === activeId) ?? restaurants[0]
  const restaurant = useMemo(
    () => ({ ...baseRestaurant, ...(overrides[baseRestaurant.id] ?? {}) }),
    [baseRestaurant, overrides],
  )

  const patchRestaurant = useCallback(
    async (fields) => {
      try {
        await api.updateRestaurant(baseRestaurant.id, fields)
        setOverrides((prev) => ({ ...prev, [baseRestaurant.id]: { ...prev[baseRestaurant.id], ...fields } }))
        refreshRestaurants?.()
        return null
      } catch (error) {
        console.error('Ravintolan päivitys epäonnistui', error)
        return error
      }
    },
    [api, baseRestaurant.id, refreshRestaurants],
  )

  const ordersState = useOrders(restaurant.id)
  const pendingCount = ordersState.orders.filter((o) => o.status === 'pending').length
  const status = useStoreStatus(restaurant, patchRestaurant)

  useOrderAlarm(pendingCount, { enabled: settings.sound, volume: settings.volume })
  const wakeLockActive = useWakeLock(settings.wakeLock)

  function selectRestaurant(id) {
    setActiveId(id)
    storageSet('pd-active-restaurant', id)
  }

  const contextValue = {
    basePath,
    restaurant,
    patchRestaurant,
    ordersState,
    pendingCount,
    settings,
    updateSettings,
    wakeLockActive,
    storeStatus: status,
    toast,
  }

  const mainNav = NAV.filter((item) => !item.bottom)
  const bottomNav = NAV.filter((item) => item.bottom)
  const mobileMore = NAV.filter((item) => !MOBILE_PRIMARY.includes(item.path))

  function renderNavItem(item, onNavigate) {
    const Icon = item.icon
    return (
      <NavLink
        key={item.path}
        to={navHref(basePath, item.path)}
        end={item.path === ''}
        className={({ isActive }) => `pd-nav__item${isActive ? ' is-active' : ''}`}
        onClick={onNavigate}
      >
        <span className="pd-nav__icon">
          <Icon size={21} strokeWidth={1.75} aria-hidden="true" />
          {item.showPending && pendingCount > 0 && <span className="pd-nav__badge">{pendingCount}</span>}
        </span>
        <span className="pd-nav__label">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <div className="pd">
        <nav className="pd-rail" aria-label="Kojelaudan osiot">
          <span className="pd-rail__brand">delivo</span>
          <div className="pd-rail__group">{mainNav.map((item) => renderNavItem(item))}</div>
          <div className="pd-rail__group pd-rail__group--bottom">{bottomNav.map((item) => renderNavItem(item))}</div>
        </nav>

        <div className="pd-main">
          <header className="pd-topbar">
            <AccountMenu
              restaurant={restaurant}
              restaurants={restaurants}
              onSelect={selectRestaurant}
              onSignOut={signOut}
            />
            <div className="pd-topbar__right">
              <SoundButton settings={settings} updateSettings={updateSettings} pendingCount={pendingCount} />
              <StoreStatus status={status} />
            </div>
          </header>

          {!online && (
            <div className="pd-offline" role="alert">
              <WifiOff size={18} aria-hidden="true" />
              Ei yhteyttä - uudet tilaukset eivät näy ennen kuin yhteys palaa. Lista päivittyy automaattisesti.
            </div>
          )}

          <main className="pd-content">
            <Routes>
              <Route index element={<HomeView />} />
              <Route path="tilaukset" element={<OrdersView />} />
              <Route path="historia" element={<HistoryView />} />
              <Route path="ruokalista" element={<MenuView />} />
              <Route path="saatavuus" element={<AvailabilityView />} />
              <Route path="arviot" element={<ReviewsView />} />
              <Route path="markkinointi" element={<MarketingView />} />
              <Route path="tilastot" element={<StatsView />} />
              <Route path="talous" element={<FinanceView />} />
              <Route path="asetukset" element={<SettingsView />} />
              <Route path="tuki" element={<SupportView />} />
              <Route path="*" element={<Navigate to={basePath} replace />} />
            </Routes>
          </main>
        </div>

        <nav className="pd-tabbar" aria-label="Kojelaudan osiot">
          {NAV.filter((item) => MOBILE_PRIMARY.includes(item.path)).map((item) =>
            renderNavItem(item, () => setMoreOpen(false)),
          )}
          <button
            type="button"
            className={`pd-nav__item${moreOpen ? ' is-active' : ''}`}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <span className="pd-nav__icon">
              <MoreHorizontal size={21} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="pd-nav__label">Lisää</span>
          </button>
          {moreOpen && (
            <div className="pd-tabbar__more">{mobileMore.map((item) => renderNavItem(item, () => setMoreOpen(false)))}</div>
          )}
        </nav>
      </div>
    </DashboardContext.Provider>
  )
}

export default function PartnerDashboard({ basePath = '/kumppani/dashboard' }) {
  const { restaurants, status, signOut, refreshRestaurants } = usePartnerAuth()

  if (status === 'loading') {
    return <div className="pd-loading">Ladataan kojelautaa...</div>
  }

  if (restaurants.length === 0) {
    return (
      <div className="pd-loading">
        <EmptyState
          icon={UtensilsCrossed}
          title="Tähän tiliin ei ole liitetty ravintolaa"
          text="Kirjauduit sisään, mutta tililläsi ei ole ravintolaa. Ota yhteyttä delivoon, niin selvitämme asian."
          action={
            <a className="pd-btn pd-btn--secondary" href="mailto:kumppanit@delivo.fi">
              Ota yhteyttä
            </a>
          }
        />
      </div>
    )
  }

  return (
    <ToastProvider>
      <Shell basePath={basePath} restaurants={restaurants} signOut={signOut} refreshRestaurants={refreshRestaurants} />
    </ToastProvider>
  )
}
