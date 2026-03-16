/**
 * Microsoft Graph API helpers.
 * Uses the logged-in user's OAuth access token from the NextAuth JWT session.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

interface GraphEvent {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

interface GraphEventsResponse {
  value: GraphEvent[]
  '@odata.nextLink'?: string
}

/**
 * Fetch calendar events for the next `weeks` weeks using the user's access token.
 */
export async function fetchCalendarEvents(
  accessToken: string,
  weeks = 8,
): Promise<GraphEvent[]> {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + weeks * 7)

  const startStr = start.toISOString()
  const endStr = end.toISOString()

  const params = new URLSearchParams({
    startDateTime: startStr,
    endDateTime: endStr,
    $select: 'id,subject,start,end',
    $top: '100',
    $orderby: 'start/dateTime asc',
  })

  const url = `${GRAPH_BASE}/me/calendarView?${params.toString()}`

  const allEvents: GraphEvent[] = []
  let nextUrl: string | undefined = url

  // Follow pagination if needed
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Graph API error ${res.status}: ${error}`)
    }

    const data: GraphEventsResponse = await res.json()
    allEvents.push(...data.value)
    nextUrl = data['@odata.nextLink']
  }

  return allEvents
}

/**
 * Update the body (notes) of an existing calendar event.
 * Requires Calendars.ReadWrite permission.
 */
export async function updateCalendarEventBody(
  accessToken: string,
  microsoftId: string,
  bodyText: string,
): Promise<void> {
  const url = `${GRAPH_BASE}/me/events/${microsoftId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: { contentType: 'text', content: bodyText },
    }),
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Graph API error ${res.status}: ${error}`)
  }
}

/**
 * Send an email via a shared mailbox.
 * Requires Mail.Send permission and "Send As" on the shared mailbox.
 */
export async function sendEmail(
  accessToken: string,
  options: {
    sharedMailbox: string
    to: string
    subject: string
    bodyHtml: string
  },
): Promise<void> {
  const res = await fetch(`${GRAPH_BASE}/me/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: options.subject,
        from: { emailAddress: { address: options.sharedMailbox } },
        body: { contentType: 'HTML', content: options.bodyHtml },
        toRecipients: [{ emailAddress: { address: options.to } }],
      },
      saveToSentItems: true,
    }),
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Graph API error ${res.status}: ${error}`)
  }
}

/**
 * Normalize a Graph API event into a plain object for storage.
 */
export function normalizeEvent(event: GraphEvent) {
  return {
    microsoftId: event.id,
    title: event.subject || '(Kein Titel)',
    startDate: new Date(event.start.dateTime + 'Z').toISOString(),
    endDate: new Date(event.end.dateTime + 'Z').toISOString(),
  }
}
