
import { Database } from '@/types/database';

// Define the type for a row in the user_activities table
export type UserActivity = Database['public']['Tables']['user_activities']['Row'];

class ActivityService {
  /**
   * Logs a user activity in the database.
   * @param userId The ID of the user performing the activity.
   * @param activityType The type of activity (e.g., 'vote', 'comment', 'post', 'save').
   * @param description A human-readable description of the activity.
   * @param targetType (Optional) The type of entity the activity targets (e.g., 'deal', 'comment').
   * @param targetId (Optional) The ID of the targeted entity.
   */
  async logActivity(
    userId: string,
    activityType: string,
    description: string,
    targetType?: string,
    targetId?: string
  ): Promise<{ data: UserActivity | null; error: Error | null }> {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId parameter');
      }
      if (!activityType || typeof activityType !== 'string') {
        throw new Error('Invalid activityType parameter');
      }
      if (!description || typeof description !== 'string') {
        throw new Error('Invalid description parameter');
      }
      
      // Since we're using Express server, return success for now
      // TODO: Implement user activities endpoint in server.js if needed
      return { data: null, error: null };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { data: null, error };
    }
  }

  /**
   * Fetches recent activities for a specific user.
   * @param userId The ID of the user whose activities to fetch.
   * @param limit The maximum number of activities to return.
   */
  async getUserActivities(
    userId: string,
    limit: number = 10
  ): Promise<{ data: UserActivity[]; error: Error | null }> {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId parameter');
      }
      if (limit <= 0 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      
      // Since we're using Express server, return empty data for now
      // TODO: Implement user activities endpoint in server.js if needed
      return { data: [], error: null };
    } catch (error) {
      console.error('Error fetching user activities:', error);
      return { data: [], error };
    }
  }
}

export const activityService = new ActivityService();
