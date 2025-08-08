const VOICE_MAP = { it: 'it-IT', fr: 'fr-FR', en: 'en-US' }
let voices = []

if (typeof window !== 'undefined' && 'speechSynthesis' in window){
  const synth = window.speechSynthesis
  const populate = () => { voices = synth.getVoices() }
  populate()
  synth.addEventListener('voiceschanged', populate)
}

export function speak(text, lang = 'it'){
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  const utter = new SpeechSynthesisUtterance(text)
  const locale = VOICE_MAP[lang] || VOICE_MAP.it
  utter.lang = locale
  utter.rate = 0.95
  utter.pitch = 1.0
  if(!voices.length) voices = synth.getVoices()
  const match = voices.find(v => v.lang?.toLowerCase().startsWith(locale.toLowerCase()))
  if(match) utter.voice = match
  synth.cancel()
  synth.speak(utter)
}
