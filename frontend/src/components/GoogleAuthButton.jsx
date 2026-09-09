function GoogleAuthButton({ label = 'Jatka Googlella' }) {
  return (
    <button type="button" className="oauth-btn">
      <svg className="oauth-btn__icon" viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.27Z"
          fill="#4285F4"
        />
        <path
          d="M10 20c2.7 0 4.96-.89 6.61-2.42l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.06v2.59A10 10 0 0 0 10 20Z"
          fill="#34A853"
        />
        <path
          d="M4.41 11.93a5.99 5.99 0 0 1 0-3.86V5.48H1.06a10 10 0 0 0 0 9.04l3.35-2.59Z"
          fill="#FBBC05"
        />
        <path
          d="M10 3.96c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.98 9.98 0 0 0 10 0a10 10 0 0 0-8.94 5.48l3.35 2.6C5.2 5.72 7.4 3.96 10 3.96Z"
          fill="#EA4335"
        />
      </svg>
      {label}
    </button>
  )
}

export default GoogleAuthButton
