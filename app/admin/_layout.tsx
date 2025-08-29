import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { 
  LayoutDashboard, 
  Users, 
  Eye, 
  Settings, 
  Flag, 
  BarChart3, 
  Shield, 
  MessageSquare,
  Activity
} from 'lucide-react-native';

export default function AdminLayout() {
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1];

  const adminRoutes = [
    { 
      name: 'dashboard', 
      title: 'Dashboard', 
      icon: <LayoutDashboard size={20} color="#6b7280" />,
      path: '/admin/dashboard'
    },
    { 
      name: 'users', 
      title: 'Users', 
      icon: <Users size={20} color="#6b7280" />,
      path: '/admin/users'
    },
    { 
      name: 'moderation', 
      title: 'Moderation', 
      icon: <Eye size={20} color="#6b7280" />,
      path: '/admin/moderation'
    },
    { 
      name: 'analytics', 
      title: 'Analytics', 
      icon: <BarChart3 size={20} color="#6b7280" />,
      path: '/admin/analytics'
    },
    { 
      name: 'communication', 
      title: 'Communication', 
      icon: <MessageSquare size={20} color="#6b7280" />,
      path: '/admin/communication'
    },
    { 
      name: 'audit-log', 
      title: 'Audit Log', 
      icon: <Shield size={20} color="#6b7280" />,
      path: '/admin/audit-log'
    },
    { 
      name: 'settings', 
      title: 'Settings', 
      icon: <Settings size={20} color="#6b7280" />,
      path: '/admin/settings'
    },
    { 
      name: 'flags', 
      title: 'Feature Flags', 
      icon: <Flag size={20} color="#6b7280" />,
      path: '/admin/flags'
    },
  ];

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
      
      {/* Admin Navigation */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Activity size={24} color="#4f46e5" />
          <Text style={styles.sidebarTitle}>Admin Panel</Text>
        </View>
        
        <ScrollView style={styles.sidebarContent}>
          {adminRoutes.map((route) => (
            <TouchableOpacity
              key={route.name}
              style={[
                styles.sidebarItem,
                currentRoute === route.name && styles.sidebarItemActive
              ]}
              onPress={() => router.push(route.path as any)}
            >
              {React.cloneElement(route.icon, {
                color: currentRoute === route.name ? '#4f46e5' : '#6b7280'
              })}
              <Text style={[
                styles.sidebarItemText,
                currentRoute === route.name && styles.sidebarItemTextActive
              ]}>
                {route.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: '#eef2ff',
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  sidebarItemTextActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
});
