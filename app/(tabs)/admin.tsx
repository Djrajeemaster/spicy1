import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminTabNavigation, AdminTab } from '@/components/admin/AdminTabNavigation';
import { useAdminData } from '@/hooks/useAdminData';
import { UserManagement } from '@/components/admin/UserManagement';
import { DealManagement } from '@/components/admin/DealManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { BannerManagement } from '@/components/admin/BannerManagement';
import { SystemSettingsManagement } from '@/components/admin/SystemSettingsManagement';
import ReportManagement from '@/components/admin/ReportManagement';
import { useAuth } from '@/contexts/AuthProvider';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const { profile } = useAuth();
  const currentUserRole = profile?.role || 'guest';

  const {
    users,
    categories,
    banners,
    pendingDeals,
    systemSettings,
    adminStats,
    loading,
    handleUserAction,
    handleDealAction,
    toggleCategory,
    addNewCategory,
    toggleBanner,
    addNewBanner,
    updateSetting,
  } = useAdminData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading admin data...</Text>
      </View>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Dashboard Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{adminStats.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{adminStats.activeDeals}</Text>
                <Text style={styles.statLabel}>Active Deals</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{adminStats.pendingReviews}</Text>
                <Text style={styles.statLabel}>Pending Reviews</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{adminStats.dailyActiveUsers}</Text>
                <Text style={styles.statLabel}>Daily Active Users</Text>
              </View>
            </View>
          </View>
        );
      case 'users':
        return <UserManagement users={users} onUserAction={(userId, action) => handleUserAction(userId, action, profile?.id || '')} />;
      case 'deals':
        return <DealManagement deals={pendingDeals} onDealAction={(dealId, action) => handleDealAction(dealId, action, profile?.id || '')} />;
      case 'banners':
        return <BannerManagement banners={banners} onToggleBanner={toggleBanner} onAddNewBanner={addNewBanner} />;
      case 'categories':
        return <CategoryManagement categories={categories} onToggleCategory={toggleCategory} onAddNewCategory={addNewCategory} />;
      case 'settings':
        return <SystemSettingsManagement settings={systemSettings} onUpdateSetting={updateSetting} />;
      case 'reports':
        return <ReportManagement />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader currentUserRole={currentUserRole} />
      <AdminTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  content: { flex: 1 },
  contentSection: { padding: 20 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', width: '48%', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  bottomPadding: { height: 100 },
});
