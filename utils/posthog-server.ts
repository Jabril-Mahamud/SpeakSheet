// utils/posthog-server.ts
import { User } from '@supabase/supabase-js'

const POSTHOG_KEY = process.env.POSTHOG_KEY
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com'

export const captureServerEvent = async (
  eventName: string,
  user: User | null,
  properties?: Record<string, any>
) => {
  if (!POSTHOG_KEY || !user?.id) return

  try {
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${POSTHOG_KEY}`
      },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: user.id,
        event: eventName,
        properties: {
          ...properties,
          source: 'server'
        }
      })
    })

    if (!response.ok) {
      throw new Error(`PostHog API error: ${response.status}`)
    }
  } catch (error) {
    // Log error but don't throw to prevent breaking the app
    console.error('PostHog tracking error:', error)
  }
}