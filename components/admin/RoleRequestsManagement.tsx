import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Check, X, Clock, User } from 'lucide-react-native';

interface RoleRequest {
  id: number;
  user_id: string;
  role: string;
  reason: string;
  status: string;
  created_at: string;
  username: string;
  email: string;
}

export const RoleRequestsManagement: React.FC = () => {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleRequests();
  }, []);

  const fetchRoleRequests = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/role-requests');
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching role requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`http://localhost:3000/api/role-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminId: 'admin' })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message);
        fetchRoleRequests();
      } else {
        Alert.alert('Error', data.error || 'Failed to update request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading role requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Role Requests</Text>
      
      <ScrollView style={styles.content}>
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Role Requests</Text>
            <Text style={styles.emptySubtitle}>No role change requests have been submitted yet.</Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.userInfo}>
                  <User size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.username}>{request.username}</Text>
                    <Text style={styles.email}>{request.email}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: request.status === 'pending' ? '#f59e0b' : request.status === 'approved' ? '#10b981' : '#ef4444' }]}>
                  <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <Text style={styles.roleLabel}>Requested Role:</Text>
                <Text style={styles.roleValue}>{request.role.charAt(0).toUpperCase() + request.role.slice(1)}</Text>
              </View>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>

              <Text style={styles.dateText}>
                Submitted: {new Date(request.created_at).toLocaleDateString()}
              </Text>

              {request.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleRequestAction(request.id, 'approved')}
                  >
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.buttonGradient}>
                      <Check size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>Approve</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRequestAction(request.id, 'rejected')}
                  >
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.buttonGradient}>
                      <X size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>Reject</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  requestDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reasonSection: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rejectButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});