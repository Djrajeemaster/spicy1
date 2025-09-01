

export interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  dealMetrics: { category: string; count: number; revenue: number }[];
  userActivity: { hour: number; active_users: number }[];
  contentStats: {
    total_deals: number;
    total_comments: number;
    total_likes: number;
    total_views: number;
    pending_moderation: number;
  };
  topCategories: { name: string; count: number; color: string }[];
  revenueData: { date: string; amount: number }[];
  userEngagement: {
    daily_active: number;
    weekly_active: number;
    monthly_active: number;
    average_session_time: number;
  };
}

class AdminAnalyticsService {
  async getAnalytics(timeRange: '7d' | '30d' | '90d'): Promise<AnalyticsData> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user growth data
    const userGrowth = await this.getUserGrowth(startDate);
    
    // Get content stats
    const contentStats = await this.getContentStats(startDate);
    
    // Get user activity by hour
    const userActivity = await this.getUserActivity(startDate);
    
    // Get top categories
    const topCategories = await this.getTopCategories(startDate);
    
    // Get user engagement metrics
    const userEngagement = await this.getUserEngagement(startDate);

    return {
      userGrowth,
      dealMetrics: [],
      userActivity,
      contentStats,
      topCategories,
      revenueData: [],
      userEngagement,
    };
  }

  private async getUserGrowth(startDate: Date) {
    try {
      // Mock data for demonstration - replace with actual query
      const days = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return Array.from({ length: Math.min(days, 30) }, (_, i) => ({
        date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 50) + 10
      }));
    } catch (error) {
      console.error('Error fetching user growth:', error);
      return [];
    }
  }

  private async getContentStats(startDate: Date) {
    try {
      // Mock data for demonstration - replace with actual queries
      return {
        total_deals: Math.floor(Math.random() * 1000) + 500,
        total_comments: Math.floor(Math.random() * 5000) + 2000,
        total_likes: Math.floor(Math.random() * 10000) + 5000,
        total_views: Math.floor(Math.random() * 50000) + 25000,
        pending_moderation: Math.floor(Math.random() * 50) + 5,
      };
    } catch (error) {
      console.error('Error fetching content stats:', error);
      return {
        total_deals: 0,
        total_comments: 0,
        total_likes: 0,
        total_views: 0,
        pending_moderation: 0,
      };
    }
  }

  private async getUserActivity(startDate: Date) {
    // This would require activity tracking in your app
    // For now, return mock data
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      active_users: Math.floor(Math.random() * 100) + 10,
    }));
  }

  private async getTopCategories(startDate: Date) {
    try {
      // Mock data for demonstration - replace with actual query
      const categories = [
        { name: 'Electronics', count: Math.floor(Math.random() * 100) + 50, color: '#4f46e5' },
        { name: 'Fashion', count: Math.floor(Math.random() * 80) + 40, color: '#10b981' },
        { name: 'Food', count: Math.floor(Math.random() * 60) + 30, color: '#f59e0b' },
        { name: 'Travel', count: Math.floor(Math.random() * 40) + 20, color: '#ef4444' },
        { name: 'Books', count: Math.floor(Math.random() * 30) + 15, color: '#8b5cf6' },
        { name: 'Games', count: Math.floor(Math.random() * 25) + 10, color: '#06b6d4' },
      ];

      return categories.sort((a, b) => b.count - a.count).slice(0, 6);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  private async getUserEngagement(startDate: Date) {
    try {
      // Mock data for demonstration - replace with actual queries
      return {
        daily_active: Math.floor(Math.random() * 500) + 100,
        weekly_active: Math.floor(Math.random() * 2000) + 500,
        monthly_active: Math.floor(Math.random() * 5000) + 1000,
        average_session_time: Math.floor(Math.random() * 3600) + 1800, // 30-90 minutes
      };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      return {
        daily_active: 0,
        weekly_active: 0,
        monthly_active: 0,
        average_session_time: 0,
      };
    }
  }

  async getRealtimeStats() {
    try {
      // Mock data for demonstration - replace with actual queries
      return {
        online_users: Math.floor(Math.random() * 100) + 20,
        recent_deals: Math.floor(Math.random() * 20) + 5,
      };
    } catch (error) {
      console.error('Error fetching realtime stats:', error);
      return {
        online_users: 0,
        recent_deals: 0,
      };
    }
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
