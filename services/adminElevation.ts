import { apiClient } from '@/utils/apiClient';



export async function elevate(ttlMinutes: number = 10): Promise<string> {
  const response = await apiClient.post('/admin/elevate', { ttl_minutes: ttlMinutes }) as { token: string };
  return response.token;
}
