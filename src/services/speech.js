const VOICE_MAP = { it: 'it-IT', fr: 'fr-FR', en: 'en-US' }
export function speak(text, lang = 'it'){
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utter = new SpeechSynthesisUtterance(text)
  const locale = VOICE_MAP[lang] || VOICE_MAP.it
  utter.lang = locale
  utter.rate = 0.95
  utter.pitch = 1.0
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  const match = voices.find(v => v.lang?.toLowerCase().startsWith(locale.toLowerCase()))
  if (match) utter.voice = match
  synth.cancel()
  synth.speak(utter)
}
