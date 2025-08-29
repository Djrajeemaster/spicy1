import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  MessageSquare, 
  Eye, 
  Shield, 
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3
} from 'lucide-react-native';
import { router } from 'expo-router';

// Mock types for demonstration
interface DashboardStats {
  total_users: number;
  active_users_today: number;
  total_deals: number;
  deals_today: number;
  pending_moderations: number;
  total_comments: number;
  reports_count: number;
  new_users_today?: number;
  active_users?: number;
  total_content?: number;
  new_content_today?: number;
  pending_moderation?: number;
  recent_activities: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    admin: string;
    type?: string;
    created_at?: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock dashboard data
      const mockStats: DashboardStats = {
        total_users: 12456,
        active_users_today: 1847,
        total_deals: 8934,
        deals_today: 127,
        pending_moderations: 23,
        total_comments: 15634,
        reports_count: 7,
        new_users_today: 89,
        active_users: 3421,
        total_content: 8934,
        new_content_today: 127,
        pending_moderation: 23,
        recent_activities: [
          {
            id: '1',
            action: 'user_ban',
            description: 'Banned user for spam behavior',
            timestamp: new Date().toISOString(),
            admin: 'AdminUser',
            type: 'moderation',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            action: 'deal_approve',
            description: 'Approved electronics deal',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            admin: 'ModeratorUser',
            type: 'content',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            action: 'settings_update',
            description: 'Updated user limit settings',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            admin: 'AdminUser',
            type: 'system',
            created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ]
      };
      
      setStats(mockStats);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'User Management',
      icon: <Users size={24} color="#4f46e5" />,
      onPress: () => router.push('/admin/users'),
      color: '#4f46e5'
    },
    {
      title: 'Content Moderation',
      icon: <Eye size={24} color="#10b981" />,
      onPress: () => router.push('/admin/moderation'),
      color: '#10b981'
    },
    {
      title: 'Analytics',
      icon: <BarChart3 size={24} color="#f59e0b" />,
      onPress: () => router.push('/admin/analytics'),
      color: '#f59e0b'
    },
    {
      title: 'Communication',
      icon: <MessageSquare size={24} color="#06b6d4" />,
      onPress: () => router.push('/admin/communication'),
      color: '#06b6d4'
    },
    {
      title: 'Audit Log',
      icon: <Shield size={24} color="#ef4444" />,
      onPress: () => router.push('/admin/audit-log'),
      color: '#ef4444'
    },
    {
      title: 'System Settings',
      icon: <Activity size={24} color="#8b5cf6" />,
      onPress: () => router.push('/admin/settings'),
      color: '#8b5cf6'
    },
    {
      title: 'Feature Flags',
      icon: <AlertTriangle size={24} color="#06b6d4" />,
      onPress: () => router.push('/admin/flags'),
      color: '#06b6d4'
    }
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome back! Here's what's happening.
        </Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Users size={20} color="#4f46e5" />
              <Text style={styles.metricValue}>{stats?.total_users || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>Total Users</Text>
            <Text style={styles.metricChange}>
              +{stats?.new_users_today || 0} today
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Activity size={20} color="#10b981" />
              <Text style={styles.metricValue}>{stats?.active_users || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>Active Users</Text>
            <Text style={styles.metricChange}>Last 24h</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <MessageSquare size={20} color="#f59e0b" />
              <Text style={styles.metricValue}>{stats?.total_content || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>Total Content</Text>
            <Text style={styles.metricChange}>
              +{stats?.new_content_today || 0} today
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <AlertTriangle size={20} color="#ef4444" />
              <Text style={styles.metricValue}>{stats?.pending_moderation || 0}</Text>
            </View>
            <Text style={styles.metricLabel}>Pending Review</Text>
            <Text style={[styles.metricChange, { color: '#ef4444' }]}>
              Needs attention
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {stats?.recent_activities?.map((activity: any, index: number) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                {getActivityIcon(activity.type || 'default')}
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.description}</Text>
                <Text style={styles.activityTime}>
                  {new Date(activity.created_at || activity.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          )) || []}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                {action.icon}
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* System Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.statusText}>Database: Healthy</Text>
          </View>
          <View style={styles.statusItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.statusText}>API: Operational</Text>
          </View>
          <View style={styles.statusItem}>
            <CheckCircle size={16} color="#10b981" />
            <Text style={styles.statusText}>Storage: Available</Text>
          </View>
          <View style={styles.statusItem}>
            <Clock size={16} color="#f59e0b" />
            <Text style={styles.statusText}>Cache: Warming</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'user_registered':
      return <Users size={14} color="#10b981" />;
    case 'content_reported':
      return <AlertTriangle size={14} color="#ef4444" />;
    case 'admin_action':
      return <Shield size={14} color="#4f46e5" />;
    case 'content_approved':
      return <CheckCircle size={14} color="#10b981" />;
    case 'content_rejected':
      return <XCircle size={14} color="#ef4444" />;
    default:
      return <Activity size={14} color="#6b7280" />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  metricsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  activityContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statusGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#111827',
  },
});
