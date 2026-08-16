// src/hooks/useSpeechInput.ts
// Diktat via Web Speech API (nur Chromium). Feature-Detection eingebaut —
// Aufrufer blenden den Mikro-Button aus, wenn `available` false ist.
'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export function useSpeechInput(onResult: (text: string) => void) {
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const available = useMemo(() => getSpeechRecognition() !== null, [])

  const toggle = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
      return
    }
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
      setRecording(false)
    }
    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)
    recognitionRef.current = recognition
    setRecording(true)
    recognition.start()
  }, [recording, onResult])

  return { available, recording, toggle }
}
