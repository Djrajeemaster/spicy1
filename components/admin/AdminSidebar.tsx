import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Users, Flag, Settings, BarChart3, Tag, Megaphone, AlertTriangle, Eye, MessageSquare, Shield, Store, DollarSign, Globe } from 'lucide-react-native';

export type AdminTab = 'dashboard' | 'users' | 'deals' | 'banners' | 'categories' | 'stores' | 'affiliates' | 'moderation' | 'analytics' | 'communication' | 'audit' | 'role-requests' | 'roles' | 'settings' | 'reports';

interface SidebarTab {
  id: AdminTab;
  name: string;
  icon: any;
  category: string;
  superadminOnly?: boolean;
}

const sidebarTabs: SidebarTab[] = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3, category: 'Overview' },
  { id: 'users', name: 'Users', icon: Users, category: 'Management' },
  { id: 'deals', name: 'Deals', icon: Flag, category: 'Management' },
  { id: 'banners', name: 'Banners', icon: Megaphone, category: 'Management' },
  { id: 'categories', name: 'Categories', icon: Tag, category: 'Management' },
  { id: 'stores', name: 'Stores', icon: Store, category: 'Management' },
  { id: 'affiliates', name: 'Affiliates', icon: DollarSign, category: 'Management' },
  { id: 'role-requests', name: 'Role Requests', icon: Shield, category: 'Management' },
  { id: 'roles', name: 'Roles', icon: Users, category: 'Management' },
  { id: 'moderation', name: 'Moderation', icon: Eye, category: 'Moderation' },
  { id: 'reports', name: 'Reports', icon: AlertTriangle, category: 'Moderation' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, category: 'Analytics' },
  { id: 'audit', name: 'Audit Log', icon: Shield, category: 'Analytics' },
  { id: 'communication', name: 'Communication', icon: MessageSquare, category: 'Other' },
  { id: 'settings', name: 'Settings', icon: Settings, category: 'Settings', superadminOnly: true },
];

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  userRole?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange, userRole }) => {
  // Group tabs by category
  const categories = Array.from(new Set(sidebarTabs.map(tab => tab.category)));

  return (
    <View style={styles.sidebarContainer}>
      <ScrollView showsVerticalScrollIndicator={true}>
        {categories.map(category => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {sidebarTabs.filter(tab => tab.category === category && (!tab.superadminOnly || userRole === 'superadmin')).map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
                onPress={() => onTabChange(tab.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === tab.id }}
                accessibilityLabel={`${tab.name} tab`}
              >
                <tab.icon size={18} color={activeTab === tab.id ? '#6366f1' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 220,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 8,
    marginTop: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f8fafc',
  },
  tabButtonActive: {
    backgroundColor: '#e0e7ff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 10,
  },
  tabTextActive: {
    color: '#6366f1',
  },
});