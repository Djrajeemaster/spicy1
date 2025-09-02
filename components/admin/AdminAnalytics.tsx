import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { BarChart3, Users, MessageSquare, TrendingUp, Calendar, Eye, Heart, DollarSign } from 'lucide-react-native';

interface AnalyticsData {
  userStats: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    activeToday: number;
  };
  dealStats: {
    total: number;
    pending: number;
    approved: number;
    thisWeek: number;
  };
  contentStats: {
    totalComments: number;
    totalLikes: number;
    totalViews: number;
    commentsThisWeek: number;
  };
  topCategories: Array<{ name: string; count: number; percentage: number }>;
  recentActivity: Array<{
    date: string;
    newUsers: number;
    newDeals: number;
    newComments: number;
  }>;
}

// Simple Chart Components for displaying data
const MetricCard = ({ title, value, icon, trend, trendValue }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
}) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
    {trend && trendValue && (
      <View style={[styles.trendContainer, trend === 'up' ? styles.trendUp : styles.trendDown]}>
        <TrendingUp size={12} color={trend === 'up' ? '#10b981' : '#ef4444'} />
        <Text style={[styles.trendText, trend === 'up' ? styles.trendUpText : styles.trendDownText]}>
          {trendValue}
        </Text>
      </View>
    )}
  </View>
);

const CategoryBar = ({ category }: { category: { name: string; count: number; percentage: number } }) => (
  <View style={styles.categoryItem}>
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryCount}>{category.count} deals</Text>
    </View>
    <View style={styles.categoryBarContainer}>
      <View style={[styles.categoryBar, { width: `${category.percentage}%` }]} />
    </View>
    <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
  </View>
);

export const AdminAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Fetch data from backend API endpoints
      const [usersRes, dealsRes, commentsRes] = await Promise.all([
        fetch('http://localhost:3000/api/users'),
        fetch('http://localhost:3000/api/deals'),
        fetch('http://localhost:3000/api/comments'),
      ]);
      if (!usersRes.ok || !dealsRes.ok || !commentsRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const users = await usersRes.json();
      const deals = await dealsRes.json();
      const comments = await commentsRes.json();
      // Process the data
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      // User statistics
      const totalUsers = users?.length || 0;
      const usersThisWeek = users?.filter((u: any) => new Date(u.created_at) >= weekAgo).length || 0;
      const usersThisMonth = users?.filter((u: any) => new Date(u.created_at) >= monthAgo).length || 0;
      const activeToday = Math.floor(totalUsers * 0.1); // Estimate active users
      // Deal statistics
      const totalDeals = deals?.length || 0;
      const pendingDeals = deals?.filter((d: any) => d.status === 'pending').length || 0;
      const approvedDeals = deals?.filter((d: any) => d.status === 'approved').length || 0;
      const dealsThisWeek = deals?.filter((d: any) => new Date(d.created_at) >= weekAgo).length || 0;
      // Content statistics
      const totalComments = comments?.length || 0;
      const commentsThisWeek = comments?.filter((c: any) => new Date(c.created_at) >= weekAgo).length || 0;
      // Category analysis
      const categoryCount: { [key: string]: number } = {};
      deals?.forEach((deal: any) => {
        const categoryName = deal.categories?.name;
        if (categoryName) {
          categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
        }
      });
      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({
          name,
          count,
          percentage: (count / totalDeals) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      // Recent activity (last 7 days)
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const newUsers = users?.filter((u: any) =>
          u.created_at.split('T')[0] === dateStr
        ).length || 0;
        const newDeals = deals?.filter((d: any) =>
          d.created_at.split('T')[0] === dateStr
        ).length || 0;
        const newComments = comments?.filter((c: any) =>
          c.created_at.split('T')[0] === dateStr
        ).length || 0;
        recentActivity.push({
          date: dateStr,
          newUsers,
          newDeals,
          newComments
        });
      }
      setAnalytics({
        userStats: {
          total: totalUsers,
          thisWeek: usersThisWeek,
          thisMonth: usersThisMonth,
          activeToday: activeToday
        },
        dealStats: {
          total: totalDeals,
          pending: pendingDeals,
          approved: approvedDeals,
          thisWeek: dealsThisWeek
        },
        contentStats: {
          totalComments,
          totalLikes: Math.floor(totalComments * 2.5), // Estimate
          totalViews: Math.floor(totalDeals * 15), // Estimate
          commentsThisWeek
        },
        topCategories,
        recentActivity
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No analytics data available</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <BarChart3 size={24} color="#4f46e5" />
        <Text style={styles.title}>Analytics Dashboard</Text>
      </View>

      {/* User Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Users"
            value={analytics.userStats.total}
            icon={<Users size={20} color="#4f46e5" />}
            trend="up"
            trendValue={`+${analytics.userStats.thisWeek} this week`}
          />
          <MetricCard
            title="Active Today"
            value={analytics.userStats.activeToday}
            icon={<Eye size={20} color="#10b981" />}
          />
        </View>
      </View>

      {/* Deal Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deal Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Deals"
            value={analytics.dealStats.total}
            icon={<DollarSign size={20} color="#f59e0b" />}
            trend="up"
            trendValue={`+${analytics.dealStats.thisWeek} this week`}
          />
          <MetricCard
            title="Pending Review"
            value={analytics.dealStats.pending}
            icon={<Calendar size={20} color="#ef4444" />}
          />
        </View>
      </View>

      {/* Content Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Comments"
            value={analytics.contentStats.totalComments}
            icon={<MessageSquare size={20} color="#8b5cf6" />}
            trend="up"
            trendValue={`+${analytics.contentStats.commentsThisWeek} this week`}
          />
          <MetricCard
            title="Likes"
            value={analytics.contentStats.totalLikes}
            icon={<Heart size={20} color="#ec4899" />}
          />
        </View>
      </View>

      {/* Top Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
        <View style={styles.categoriesContainer}>
          {analytics.topCategories.map((category, index) => (
            <CategoryBar key={index} category={category} />
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity (Last 7 Days)</Text>
        <View style={styles.activityContainer}>
          {analytics.recentActivity.map((day, index) => (
            <View key={index} style={styles.activityDay}>
              <Text style={styles.activityDate}>
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <View style={styles.activityMetrics}>
                <Text style={styles.activityMetric}>👥 {day.newUsers}</Text>
                <Text style={styles.activityMetric}>🏷️ {day.newDeals}</Text>
                <Text style={styles.activityMetric}>💬 {day.newComments}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendUp: {
    backgroundColor: '#dcfce7',
  },
  trendDown: {
    backgroundColor: '#fee2e2',
  },
  trendText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  trendUpText: {
    color: '#10b981',
  },
  trendDownText: {
    color: '#ef4444',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoryCount: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryBarContainer: {
    flex: 2,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  categoryBar: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  activityContainer: {
    gap: 8,
  },
  activityDay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  activityDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  activityMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  activityMetric: {
    fontSize: 12,
    color: '#64748b',
  },
  bottomPadding: {
    height: 100,
  },
});