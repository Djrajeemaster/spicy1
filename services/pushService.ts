


export async function sendPushToUser(userId: string, payload: { title: string; body: string; data?: any }) {
  await fetch('http://localhost:3000/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, title: payload.title, body: payload.body, data: payload.data || {} }),
    credentials: 'include'
  });
}
