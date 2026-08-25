import { registerPlugin } from '@capacitor/core'
import { MOBILE } from './mobile.js'

// Android can ask other media apps to duck while LiftNex announces a rest timer.
// Browsers deliberately cannot change another app's volume, so this is a native-only
// enhancement with a silent web fallback.
const AudioFocus = registerPlugin('AudioFocus')

export const duckOtherAudio = () => MOBILE ? AudioFocus.duck().catch(() => {}) : Promise.resolve()
export const restoreOtherAudio = () => MOBILE ? AudioFocus.restore().catch(() => {}) : Promise.resolve()
