import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminTab } from '@/components/admin/AdminTabNavigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAdminData } from '@/hooks/useAdminData';
import { UserManagement } from '@/components/admin/UserManagement';
import { DealManagement } from '@/components/admin/DealManagement';
import { CategoryManagement } from '@/components/admin/CategoryManagement';
import { StoreManagement } from '@/components/admin/StoreManagement';
import { BannerManagement } from '@/components/admin/BannerManagement';
import { SystemSettingsManagement } from '@/components/admin/SystemSettingsManagement';
import { AffiliateManagement } from '@/components/admin/AffiliateManagement';
import ReportManagement from '@/components/admin/ReportManagement';
import { useAuth } from '@/contexts/AuthProvider';
import { router } from 'expo-router';

// Import role management components
import { RoleRequestsManagement } from '@/components/admin/RoleRequestsManagement';
import { RolesManagement } from '@/components/admin/RolesManagement';

// Import admin feature components
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import AdminModeration from '@/components/admin/AdminModeration';
import AdminCommunication from '@/components/admin/AdminCommunication';
import AdminAuditLog from '@/components/admin/AdminAuditLog';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const { profile, user, loading } = useAuth();
  const currentUserRole = profile?.role || 'guest';

  // Call useAdminData hook at the top level before any conditional returns
  const {
    users,
    categories,
    banners,
    pendingDeals,
    systemSettings,
    adminStats,
    loading: adminLoading,
    handleUserAction,
    handleDealAction,
    toggleCategory,
    addNewCategory,
    toggleBanner,
    addNewBanner,
    deleteBanner,
    updateSetting,
    refreshData,
  } = useAdminData();

  // Redirect unauthenticated users to login
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [loading, user]);

  if (!loading && !user) {
    return null;
  }

  // Restrict access to settings tab for non-superadmin
  if (activeTab === 'settings' && currentUserRole !== 'superadmin') {
    return (
      <View style={styles.sidebarLayout}>
        <AdminHeader currentUserRole={currentUserRole} />
        <View style={styles.contentSection}>
          <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 18 }}>Access Denied</Text>
          <Text style={{ marginTop: 8 }}>You do not have permission to view this page.</Text>
        </View>
      </View>
    );
  }

  // Refresh admin data when screen comes into focus - but only if data is stale
  const lastAdminLoadRef = useRef(0);
  const ADMIN_RELOAD_THRESHOLD = 15 * 60 * 1000; // 15 minutes for admin data

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastAdminLoadRef.current;
      
      // Only reload if data is stale or missing
      if (timeSinceLastLoad > ADMIN_RELOAD_THRESHOLD || !adminStats) {
        console.log('🔄 Admin: Reloading data on focus');
        refreshData();
        lastAdminLoadRef.current = now;
      } else {
        console.log('📱 Admin: Skipping reload, data is fresh');
      }
    }, [refreshData, adminStats])
  );

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
            <Text style={styles.sectionTitle}>Admin Dashboard</Text>
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
        return <UserManagement 
          users={users} 
          onUserAction={(userId, action) => handleUserAction(userId, action, profile?.id || '')} 
          onAddUser={() => router.push('/add-user')}
        />;
      case 'deals':
        return <DealManagement 
          deals={pendingDeals} 
          onDealAction={async (dealId, action) => {
            console.log('Admin onDealAction called:', { dealId, action });
            try {
              await handleDealAction(dealId, action, profile?.id || '');
              console.log('handleDealAction completed successfully');
              window.alert(`Deal ${action.toLowerCase()}d successfully`);
              refreshData();
            } catch (error) {
              console.error('handleDealAction failed:', error);
              window.alert(`Failed to ${action.toLowerCase()} deal`);
            }
          }} 
        />;
      case 'moderation':
        return <AdminModeration />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'communication':
        return <AdminCommunication />;
      case 'audit':
        return <AdminAuditLog />;
      case 'banners':
        return <BannerManagement banners={banners} onToggleBanner={toggleBanner} onAddNewBanner={addNewBanner} onDeleteBanner={deleteBanner} />;
      case 'categories':
        return <CategoryManagement categories={categories} onToggleCategory={toggleCategory} onAddNewCategory={addNewCategory} onRefresh={refreshData} />;
      case 'stores':
        return <StoreManagement onRefresh={() => window.location.reload()} />;
      case 'affiliates':
        return <AffiliateManagement onRefresh={() => window.location.reload()} />;
      case 'settings':
        return <SystemSettingsManagement settings={systemSettings} onUpdateSetting={updateSetting} />;
      case 'reports':
        return <ReportManagement />;
      case 'role-requests':
        return <RoleRequestsManagement />;
      case 'roles':
        return <RolesManagement />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.sidebarLayout}>
      <AdminHeader currentUserRole={currentUserRole} />
      <View style={styles.mainRow}>
        <View style={styles.sidebarWrapper}>
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUserRole} />
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'settings' && currentUserRole !== 'superadmin' ? null : renderContent()}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarLayout: { flex: 1, backgroundColor: '#f8fafc' },
  mainRow: { flex: 1, flexDirection: 'row' },
  sidebarWrapper: { width: 220, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
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
