

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  requirement: number;
  type: 'deals_posted' | 'deals_saved' | 'comments_made' | 'upvotes_received' | 'login_streak';
}

export interface UserStats {
  user_id: string;
  total_points: number;
  deals_posted: number;
  deals_saved: number;
  comments_made: number;
  upvotes_received: number;
  login_streak: number;
  level: number;
  badges: UserBadge[];
}

class GamificationService {
  async getUserStats(userId: string): Promise<{ data: UserStats | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/gamification/stats/${userId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user stats');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async awardPoints(userId: string, points: number, action: string) {
    try {
      const response = await fetch('http://localhost:3000/api/gamification/award-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, points, action }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to award points');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async checkAchievements(userId: string) {
    try {
      const { data: stats } = await this.getUserStats(userId);
      if (!stats) return;

      const achievements: Achievement[] = [
        { id: '1', name: 'First Post', description: 'Posted your first deal', icon: '🎯', points: 10, requirement: 1, type: 'deals_posted' },
        { id: '2', name: 'Deal Hunter', description: 'Posted 10 deals', icon: '🏹', points: 50, requirement: 10, type: 'deals_posted' },
        { id: '3', name: 'Collector', description: 'Saved 25 deals', icon: '💎', points: 25, requirement: 25, type: 'deals_saved' },
        { id: '4', name: 'Commentator', description: 'Made 50 comments', icon: '💬', points: 30, requirement: 50, type: 'comments_made' },
        { id: '5', name: 'Popular', description: 'Received 100 upvotes', icon: '⭐', points: 100, requirement: 100, type: 'upvotes_received' },
      ];

      for (const achievement of achievements) {
        const currentValue = stats[achievement.type] || 0;
        if (currentValue >= achievement.requirement) {
          await this.awardBadge(userId, achievement.id);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  async awardBadge(userId: string, badgeId: string) {
    try {
      const response = await fetch('http://localhost:3000/api/gamification/award-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, badgeId }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to award badge');
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const response = await fetch(`http://localhost:3000/api/gamification/leaderboard?limit=${limit}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  calculateLevel(points: number): number {
    // Level formula: level = floor(sqrt(points / 100))
    return Math.floor(Math.sqrt(points / 100)) + 1;
  }

  getPointsForNextLevel(currentPoints: number): number {
    const currentLevel = this.calculateLevel(currentPoints);
    const nextLevelPoints = Math.pow(currentLevel, 2) * 100;
    return nextLevelPoints - currentPoints;
  }
}

export const gamificationService = new GamificationService();