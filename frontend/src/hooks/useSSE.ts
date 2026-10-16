import { useEffect, useState } from 'react'
import { getToken } from '../api/client'
import type { LiveEvent } from '../types'

export function useSSE(enabled: boolean) {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    if (!enabled) return

    const token = getToken()
    if (!token) return

    let cancelled = false
    let controller: AbortController | null = null

    async function connect() {
      while (!cancelled) {
        controller = new AbortController()
        try {
          const response = await fetch('/api/events/stream', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })
          if (!response.ok || !response.body) {
            setConnected(false)
            await wait(3000)
            continue
          }
          setConnected(true)
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          while (!cancelled) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const chunks = buffer.split('\n\n')
            buffer = chunks.pop() || ''
            for (const chunk of chunks) {
              const line = chunk.split('\n').find((l) => l.startsWith('data: '))
              if (!line) continue
              try {
                const payload = JSON.parse(line.slice(6)) as LiveEvent
                setEvents((prev) => [payload, ...prev].slice(0, 40))
              } catch {
                // ignore malformed
              }
            }
          }
        } catch {
          if (!cancelled) setConnected(false)
        }

        if (!cancelled) {
          setConnected(false)
          await wait(3000)
        }
      }
    }

    connect()
    return () => {
      cancelled = true
      controller?.abort()
    }
  }, [enabled])

  return { connected, events }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
