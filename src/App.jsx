import { useEffect, useState } from 'react'
import { auth } from './firebase/firebase.jsx'
import './App.css'
import LoginView from './view/LoginView.jsx'
import HubView from './view/HubView.jsx'

function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => auth.onAuthStateChanged(setUser), [])

  if (user === undefined) return <main className="loading-page">Caricamento...</main>
  return user ? <HubView user={user} /> : <LoginView />
}

export default App
