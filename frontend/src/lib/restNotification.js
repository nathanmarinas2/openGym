import { MOBILE, clearNativeRestNotification, updateNativeRestNotification } from './mobile.js'

const TAG = 'liftnex-rest-timer'
let lastShown = null
const clock = sec => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`

const permissionGranted = () => typeof Notification !== 'undefined' && Notification.permission === 'granted'

export async function syncRestNotification({ left, total, label }) {
  if (MOBILE) return updateNativeRestNotification({ left, total, label })
  if (!permissionGranted() || !('serviceWorker' in navigator)) return false
  const bucket = left <= 10 ? left : Math.ceil(left / 5) * 5
  if (bucket === lastShown) return true
  lastShown = bucket
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(`LiftNex · ${label || 'Rest'}`, {
      body: `${clock(left)} remaining`,
      tag: TAG,
      renotify: false,
      silent: true,
      icon: './icon-512.png',
      badge: './icon-180.png',
      data: { route: './#/workout' }
    })
    return true
  } catch { return false }
}

export async function finishRestNotification(label = 'Rest') {
  lastShown = null
  if (MOBILE) return clearNativeRestNotification()
  if (!permissionGranted() || !('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.getNotifications({ tag: TAG })
    existing.forEach(notification => notification.close())
    await registration.showNotification(`LiftNex · ${label}`, {
      body: 'Time for your next set.', tag: TAG, renotify: true,
      icon: './icon-512.png', badge: './icon-180.png', data: { route: './#/workout' }
    })
    return true
  } catch { return false }
}

export async function clearRestNotification() {
  lastShown = null
  if (MOBILE) return clearNativeRestNotification()
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.getNotifications({ tag: TAG })
    existing.forEach(notification => notification.close())
    return true
  } catch { return false }
}
