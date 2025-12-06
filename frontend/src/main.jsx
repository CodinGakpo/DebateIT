import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { KindeProvider } from "@kinde-oss/kinde-auth-react";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
  <KindeProvider
  domain={import.meta.env.VITE_KINDE_DOMAIN}
  clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
  redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URI}
  logoutUri={import.meta.env.VITE_KINDE_LOGOUT_REDIRECT_URI}
  isDangerouslyUseLocalStorage={true} 
>
  <App />
</KindeProvider>

  </React.StrictMode>,
)
