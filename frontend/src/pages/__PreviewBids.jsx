/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Renders the post-order courier choice view (radar + facts) so it can be
   reviewed without placing a real order. Same pattern as __PreviewCart.jsx. */
import DeliveryBidPanel from '../components/DeliveryBidPanel.jsx'
import '../components/OrderTrackingModal.css'
import './Cart.css'

export default function PreviewBids() {
  return (
    <div className="page page--cart">
      <main className="cart-page">
        <div className="order-radar">
          <div className="tracking__bids">
            <DeliveryBidPanel orderId="preview-order" illustrated logo="B" />
          </div>
          <p className="order-radar__facts">
            <span>Burger Talli</span>
            <span>FIKO-0064</span>
            <span>6,19 €</span>
          </p>
          <a href="/" className="order-radar__home">
            Takaisin etusivulle
          </a>
        </div>
      </main>
    </div>
  )
}
