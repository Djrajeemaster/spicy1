import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { reportService } from '@/services/reportService';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthProvider';

export default function ModeratorDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, loading: authLoading } = useAuth();
  const currentUserRole = profile?.role || 'guest';

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      const { data, error } = await reportService.getPendingReports();
      if (error) Alert.alert('Error', 'Failed to load reports');
      setReports(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchReports();
  }, []);

  // Redirect unauthenticated users to login
  if (!authLoading && !user) {
    // @ts-ignore
    if (typeof window !== 'undefined') window.location.href = '/sign-in';
    return null;
  }

  // Restrict access to non-moderators
  if (currentUserRole !== 'moderator' && currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 18 }}>Access Denied</Text>
        <Text style={{ marginTop: 8 }}>You do not have permission to view this page.</Text>
      </View>
    );
  }

  const handleSuspendUser = async (userId: string) => {
    const { error } = await userService.updateUserStatus(userId, 'suspended', user?.id || '');
    if (error) Alert.alert('Error', 'Failed to suspend user');
    else Alert.alert('Success', 'User suspended');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Moderator Dashboard</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Reports</Text>
        {loading ? <ActivityIndicator /> : reports.length === 0 ? (
          <Text>No pending reports.</Text>
        ) : (
          reports.map((report, idx) => (
            <View key={idx} style={styles.reportCard}>
              <Text style={styles.reportTitle}>{report.deal?.title || 'Unknown Deal'}</Text>
              <Text>Reported by: {report.reporter?.username || 'Unknown'}</Text>
              <Text>Reason: {report.reason}</Text>
              <TouchableOpacity style={styles.button} onPress={() => handleSuspendUser(report.reporter?.id)}>
                <Text style={styles.buttonText}>Suspend Reporter</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  reportCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  reportTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  button: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
