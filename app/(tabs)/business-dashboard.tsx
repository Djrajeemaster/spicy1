import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { dealService } from '@/services/dealService';
import { useAuth } from '@/contexts/AuthProvider';

export default function BusinessDashboard() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, loading: authLoading } = useAuth();
  const currentUserRole = profile?.role || 'guest';

  // Redirect unauthenticated users to login
  if (!authLoading && !user) {
    // @ts-ignore
    if (typeof window !== 'undefined') window.location.href = '/sign-in';
    return null;
  }

  // Restrict access to non-business/verified users
  if (currentUserRole !== 'business' && currentUserRole !== 'verified' && currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 18 }}>Access Denied</Text>
        <Text style={{ marginTop: 8 }}>You do not have permission to view this page.</Text>
      </View>
    );
  }

  useEffect(() => {
    async function fetchDeals() {
      setLoading(true);
      const [err, data] = await dealService.getUserDeals(user?.id || '');
      if (err) Alert.alert('Error', 'Failed to load deals');
      setDeals(data || []);
      setLoading(false);
    }
    fetchDeals();
  }, [user]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Verified Business Dashboard</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Deals</Text>
        {loading ? <ActivityIndicator /> : deals.length === 0 ? (
          <Text>No deals posted yet.</Text>
        ) : (
          deals.map((deal, idx) => (
            <View key={idx} style={styles.dealCard}>
              <Text style={styles.dealTitle}>{deal.title}</Text>
              <Text>Status: {deal.status}</Text>
              <Text>Price: {deal.price}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dealCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  dealTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  button: { backgroundColor: '#059669', padding: 12, borderRadius: 8, marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
