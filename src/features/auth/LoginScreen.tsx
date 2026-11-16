import { useState, type FormEvent } from 'react'
import { authErrorMessage, resetPassword, signIn } from '../../data/auth'
import { Button } from '../../ui'

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-[17px] outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-soft'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (loginError) {
      setError(authErrorMessage(loginError))
    } finally {
      setLoading(false)
    }
  }

  async function forgot() {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Scrivi la tua email qui sopra, poi tocca di nuovo “Password dimenticata?”.')
      return
    }
    try {
      await resetPassword(email)
      setInfo(`Se l'indirizzo è registrato, riceverai un'email per reimpostare la password.`)
    } catch (resetError) {
      setError(authErrorMessage(resetError))
    }
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-bg px-4"
      style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
    >
      <form onSubmit={submit} className="w-full max-w-sm" noValidate>
        <img src="/icons/icon-192.png" alt="" className="mx-auto size-20 rounded-[22px] shadow-card" />
        <h1 className="mt-5 text-center text-[34px] font-bold tracking-tight">My Gesture</h1>
        <p className="mt-1 text-center text-[17px] text-muted">Le tue finanze, a colpo d'occhio.</p>
        <div className="mt-8 rounded-2xl bg-surface p-4 shadow-card">
          <label htmlFor="email" className="text-[15px] font-semibold text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={inputClass}
          />
          <label htmlFor="password" className="mt-4 block text-[15px] font-semibold text-muted">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className={inputClass}
          />
          {error && (
            <p role="alert" className="mt-3 text-[15px] text-negative">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="mt-3 text-[15px] text-muted">
              {info}
            </p>
          )}
          <Button type="submit" block className="mt-5" disabled={loading || !email || !password}>
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </Button>
        </div>
        <Button variant="plain" block className="mt-2" onClick={forgot}>
          Password dimenticata?
        </Button>
      </form>
    </main>
  )
}
