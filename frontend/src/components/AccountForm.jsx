import { useState } from 'react'
import { getLang, useLang } from '../lib/i18n.js'
import { accountLogin, accountRegister } from '../lib/api.js'
import { Button, TextField } from './ui.jsx'

const EN = {
  createTitle: 'Create your account', loginTitle: 'Sign in',
  name: 'Username', nameHint: 'Choose a name you will remember', password: 'Password',
  passwordHint: 'At least 6 characters', create: 'Create account', login: 'Sign in',
  creating: 'Creating…', signing: 'Signing in…', switchLogin: 'Already have an account? Sign in',
  switchCreate: 'New here? Create an account', local: 'You can also continue without an account.',
  error: 'Could not complete this request.'
}
const ES = {
  createTitle: 'Crear cuenta', loginTitle: 'Iniciar sesión',
  name: 'Nombre de usuario', nameHint: 'Elige un nombre que recuerdes', password: 'Contraseña',
  passwordHint: 'Al menos 6 caracteres', create: 'Crear cuenta', login: 'Iniciar sesión',
  creating: 'Creando…', signing: 'Entrando…', switchLogin: '¿Ya tienes cuenta? Inicia sesión',
  switchCreate: '¿Eres nuevo? Crea una cuenta', local: 'También puedes continuar sin cuenta.',
  error: 'No se ha podido completar la operación.'
}

export default function AccountForm({ initialMode = 'login', onSuccess, compact = false }) {
  useLang()
  const C = getLang() === 'es' ? ES : EN
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const register = mode === 'register'

  const submit = async event => {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName.length < 2) { setError(C.nameHint); return }
    if (password.length < 6) { setError(C.passwordHint); return }
    setBusy(true); setError('')
    try {
      const user = register ? await accountRegister(cleanName, password) : await accountLogin(cleanName, password)
      await onSuccess(user)
    } catch (e) { setError(e.message || C.error) }
    finally { setBusy(false) }
  }

  return <form className={'account-form' + (compact ? ' compact' : '')} onSubmit={submit}>
    <h3>{register ? C.createTitle : C.loginTitle}</h3>
    <label className="account-label">{C.name}
      <TextField value={name} onChange={e => setName(e.target.value)} placeholder={C.nameHint}
        autoComplete="username" maxLength={40} autoFocus={!compact} />
    </label>
    <label className="account-label">{C.password}
      <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={C.passwordHint}
        autoComplete={register ? 'new-password' : 'current-password'} minLength={6} maxLength={128} />
    </label>
    {error && <div className="account-error" role="alert">{error}</div>}
    <Button variant="primary" type="submit" disabled={busy}>{busy ? (register ? C.creating : C.signing) : (register ? C.create : C.login)}</Button>
    <button type="button" className="account-switch" onClick={() => { setMode(register ? 'login' : 'register'); setError('') }}>
      {register ? C.switchLogin : C.switchCreate}
    </button>
    {!compact && <p className="account-local">{C.local}</p>}
  </form>
}
