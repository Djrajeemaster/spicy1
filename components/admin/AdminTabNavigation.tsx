import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Users, Flag, Settings, ChartBar as BarChart3, Tag, Megaphone, AlertTriangle } from 'lucide-react-native';

export type AdminTab = 'dashboard' | 'users' | 'deals' | 'banners' | 'categories' | 'settings' | 'reports';

interface AdminTabNavigationProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const tabs = [
  { id: 'dashboard' as AdminTab, name: 'Dashboard', icon: BarChart3 },
  { id: 'users' as AdminTab, name: 'Users', icon: Users },
  { id: 'deals' as AdminTab, name: 'Deals', icon: Flag },
  { id: 'banners' as AdminTab, name: 'Banners', icon: Megaphone },
  { id: 'categories' as AdminTab, name: 'Categories', icon: Tag },
  { id: 'settings' as AdminTab, name: 'Settings', icon: Settings },
  { id: 'reports' as AdminTab, name: 'Reports', icon: AlertTriangle },
];

export const AdminTabNavigation: React.FC<AdminTabNavigationProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  return (
    <View style={styles.tabNavigation}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabContainer}>
          {tabs.map(tab => (
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
          ))}
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
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 48,
  },
  tabActive: {
    backgroundColor: '#1f2937',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
