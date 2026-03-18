# Supabase Realtime Broadcast & Presence Research

## 1. Broadcast API (@supabase/supabase-js v2)

### Sending Messages
Two transmission modes exist:

```js
const myChannel = supabase.channel('test-channel')

// HTTP mode (before subscription)
myChannel.send({
  type: 'broadcast',
  event: 'shout',
  payload: { message: 'Hi' }
}).then(resp => console.log(resp))

// WebSocket mode (after subscription, lower latency)
myChannel.subscribe(status => {
  if (status !== 'SUBSCRIBED') return
  myChannel.send({
    type: 'broadcast',
    event: 'shout',
    payload: { message: 'Hi' }
  })
})
```

**Key difference**: Pre-subscription messages use HTTP; post-subscription use WebSocket for lower latency.

### Receiving Messages
```js
const myChannel = supabase.channel('test-channel')

myChannel
  .on('broadcast', { event: 'shout' }, payload => {
    console.log('Received:', payload)
  })
  .on('broadcast', { event: '*' }, payload => {
    // Listen to all events on channel
  })
  .subscribe()
```

### Acknowledgments
Enable ack on channel creation to ensure message delivery:
```js
const myChannel = supabase.channel('room-3', {
  config: { broadcast: { ack: true } }
})
```

---

## 2. Presence API

### Tracking Presence
```js
const roomOne = supabase.channel('room_01')

roomOne.subscribe(async status => {
  if (status !== 'SUBSCRIBED') return

  await roomOne.track({
    user: 'user-1',
    online_at: new Date().toISOString()
  })
})
```

### Listening to Events
Three event types: `sync` (full state), `join` (new client), `leave` (client disconnected)

```js
roomOne
  .on('presence', { event: 'sync' }, () => {
    const newState = roomOne.presenceState()
    console.log('sync', newState)
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('join', key, newPresences)
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('leave', key, leftPresences)
  })
  .subscribe()
```

### Cleanup
Use `untrack()` to stop tracking and prevent ghost users:
```js
await roomOne.untrack()
```

**Important**: During sync events, you may receive simultaneous join/leave events—this is expected as Presence reconciles local state with server state, not actual user movement.

---

## 3. Combined Broadcast + Presence Pattern (React/Next.js)

### Basic Structure
```js
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function CollaborativeFeature() {
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const supabase = createClient(URL, KEY)

  useEffect(() => {
    const channel = supabase.channel('shared-room')

    // Setup presence
    channel
      .on('presence', { event: 'sync' }, () => {
        setUsers(Object.values(channel.presenceState()).flat())
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setUsers(prev => [...prev, ...newPresences])
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setUsers(prev => prev.filter(u => !leftPresences.includes(u)))
      })

    // Setup broadcast
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload])
      })

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: 'user-123', cursor_x: 0 })
      }
    })

    // Cleanup on unmount
    return () => {
      channel.untrack()
      channel.unsubscribe()
    }
  }, [])

  return (
    <div>
      <p>Active users: {users.length}</p>
      {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
    </div>
  )
}
```

### Key Patterns
1. **Subscribe before track**: Always check `SUBSCRIBED` status before calling `track()`
2. **Cleanup on unmount**: Return cleanup function with `untrack()` + `unsubscribe()`
3. **React 18 gotcha**: useEffect cleanup must properly await async operations to avoid premature unsubscription
4. **Error handling**: Implement retry logic with setTimeout for reconnection failures

---

## 4. Reconnection & Error Handling

Supabase handles automatic reconnection via heartbeats. For manual error handling:

```js
channel.subscribe(status => {
  if (status === 'CHANNEL_ERROR') {
    // Reconnect on error
    setTimeout(() => {
      channel.unsubscribe()
      channel.subscribe()
    }, 3000)
  }
})
```

If message throughput exceeds limits, connections disconnect automatically. supabase-js reconnects when throughput decreases.

---

## 5. Free Tier Limits

| Metric | Limit |
|--------|-------|
| Concurrent connections | 200 |
| Messages/sec | 100 |
| Channel joins/sec | 100 |
| Channels per connection | 100 |
| Presence keys per object | 10 |
| Presence messages/sec | 20 |
| Broadcast payload size | 256 KB |
| Postgres change payload | 1,024 KB |

**Caveat**: Free projects pause after 7 days of inactivity (unsuitable for 24/7 apps).

---

## 6. Anonymous Access (Without Auth)

### Key Points
- **Public access is enabled by default** in Realtime Settings
- Use `anon` API key (safe to expose with RLS enabled)
- **Anonymous connections limited to 24 hours** unless upgraded with user auth
- Works without creating Supabase Auth users

### Implementation
```js
// Uses anon key for public channels
const supabase = createClient(URL, ANON_KEY)

const channel = supabase.channel('public-room')
  // No private: true flag needed

channel.subscribe(async status => {
  if (status === 'SUBSCRIBED') {
    await channel.track({ guest_id: crypto.randomUUID() })
  }
})
```

### RLS Policies for Anonymous
Create policies with `to anon` role:
```sql
CREATE POLICY "Allow anon broadcast"
ON realtime.messages
FOR ALL
TO anon
USING (true)
```

**Security**: RLS checks access against user's JWT claims; anon key uses the anonymous Postgres role.

---

## Summary

- **Broadcast**: Low-latency pub/sub for custom events; send/receive flexible payloads
- **Presence**: Automatic state sync; handles join/leave events with built-in ghost cleanup
- **Free tier**: Suitable for MVP/testing; 200 concurrent connections, 100 msg/sec limits
- **Anonymous**: Works without auth; 24-hour max for unauthenticated connections; use RLS for access control
- **Best practice**: Combine Broadcast + Presence for collaborative features; always cleanup on unmount in React; handle reconnection gracefully

---

## Sources

- [Broadcast | Supabase Docs](https://supabase.com/docs/guides/realtime/broadcast)
- [Presence | Supabase Docs](https://supabase.com/docs/guides/realtime/presence)
- [Realtime Limits | Supabase Docs](https://supabase.com/docs/guides/realtime/limits)
- [Realtime Authorization | Supabase Docs](https://supabase.com/docs/guides/realtime/authorization)
- [Getting Started with Realtime | Supabase Docs](https://supabase.com/docs/guides/realtime/getting_started)
- [Using Realtime with Next.js | Supabase Docs](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
