import { apiClient } from '@/utils/apiClient';




export async function sendPushToUser(userId: string, payload: { title: string; body: string; data?: any }) {
  await apiClient.post('/push/send', { 
    user_id: userId, 
    title: payload.title, 
    body: payload.body, 
    data: payload.data || {} 
  });
}
