import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Users, Flag, Settings, BarChart3, Tag, Megaphone, AlertTriangle, Eye, MessageSquare, Shield, Store, DollarSign, Globe } from 'lucide-react-native';

export type AdminTab = 'dashboard' | 'users' | 'deals' | 'banners' | 'categories' | 'stores' | 'affiliates' | 'moderation' | 'analytics' | 'communication' | 'audit' | 'role-requests' | 'roles' | 'settings' | 'reports';

interface AdminTabNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  userRole?: string;
}

const tabs = [
  { id: 'dashboard' as AdminTab, name: 'Dashboard', icon: BarChart3 },
  { id: 'users' as AdminTab, name: 'Users', icon: Users },
  { id: 'deals' as AdminTab, name: 'Deals', icon: Flag },
  { id: 'moderation' as AdminTab, name: 'Moderation', icon: Eye },
  { id: 'analytics' as AdminTab, name: 'Analytics', icon: BarChart3 },
  { id: 'communication' as AdminTab, name: 'Communication', icon: MessageSquare },
  { id: 'audit' as AdminTab, name: 'Audit Log', icon: Shield },
  { id: 'role-requests' as AdminTab, name: 'Role Requests', icon: Shield },
  { id: 'roles' as AdminTab, name: 'Roles', icon: Users },
  { id: 'banners' as AdminTab, name: 'Banners', icon: Megaphone },
  { id: 'categories' as AdminTab, name: 'Categories', icon: Tag },
  { id: 'stores' as AdminTab, name: 'Stores', icon: Store },
  { id: 'affiliates' as AdminTab, name: 'Affiliates', icon: DollarSign },
  { id: 'reports' as AdminTab, name: 'Reports', icon: AlertTriangle },
  { id: 'settings' as AdminTab, name: 'Settings', icon: Settings },
];

export const AdminTabNavigation: React.FC<AdminTabNavigationProps> = ({ 
  activeTab, 
  onTabChange,
  userRole
}) => {
  return (
    <View style={styles.tabNavigation}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabContainer}>
          {tabs.map(tab => {
            if (tab.id === 'settings' && userRole !== 'superadmin') return null;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => onTabChange(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.id }}
                accessibilityLabel={`${tab.name} tab`}
              >
                <tab.icon size={18} color={activeTab === tab.id ? '#FFFFFF' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabNavigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});