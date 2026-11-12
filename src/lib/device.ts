let audioContext: AudioContext | null = null

interface AudioSessionNavigator {
  audioSession?: { type: string }
}

// iOS only allows audio that was unlocked by a user gesture, so the context is
// created on a tap and reused when the rest timer later finishes. The
// "playback" session lets the beep play even with the silent switch on.
export function unlockAudio(): void {
  if (typeof window.AudioContext === 'undefined') return
  const session = (navigator as Navigator & AudioSessionNavigator).audioSession
  if (session) session.type = 'playback'
  audioContext ??= new AudioContext()
  if (audioContext.state !== 'running') void audioContext.resume()
}

function beep(context: AudioContext): void {
  const start = context.currentTime
  for (const offset of [0, 0.25]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start + offset)
    oscillator.stop(start + offset + 0.2)
  }
}

export function signalRestFinished(): void {
  navigator.vibrate?.([200, 100, 200])
  const context = audioContext
  if (!context) return
  if (context.state === 'running') beep(context)
  else void context.resume().then(() => beep(context), () => undefined)
}
