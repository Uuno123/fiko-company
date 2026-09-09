import './RestaurantAvatarPlaceholder.css'

function initialFrom(name) {
  return name?.trim().charAt(0).toUpperCase() || '?'
}

function RestaurantAvatarPlaceholder({ name, size = 'card' }) {
  return (
    <div className={`avatar-placeholder avatar-placeholder--${size}`} role="img" aria-label={name}>
      <span>{initialFrom(name)}</span>
    </div>
  )
}

export default RestaurantAvatarPlaceholder
