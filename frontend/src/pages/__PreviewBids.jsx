/* TEMPORARY PREVIEW FILE - not part of the app, not linked from anywhere, safe to delete.
   Renders the post-order courier choice view (CourierBidsIntro + facts + DeliveryBidPanel)
   so it can be reviewed without placing a real order. Same pattern as __PreviewCart.jsx. */
import CourierBidsIntro from '../components/CourierBidsIntro.jsx'
import DeliveryBidPanel from '../components/DeliveryBidPanel.jsx'
import './Cart.css'

export default function PreviewBids() {
  return (
    <div className="page page--cart">
      <main className="cart-page">
        <div className="cart-empty order-done order-done--bids">
          <CourierBidsIntro />
          <dl className="order-done__facts">
            <div>
              <dt>Tilausnumero</dt>
              <dd>FIKO-0050</dd>
            </div>
            <div>
              <dt>Summa</dt>
              <dd>6,19 €</dd>
            </div>
          </dl>
          <div className="order-done__bids">
            <DeliveryBidPanel orderId="preview-order" />
          </div>
          <div className="order-done__actions">
            <button type="button" className="order-done__home">
              Takaisin etusivulle
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
