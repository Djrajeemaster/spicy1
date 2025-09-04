import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RoleRequestForm from './RoleRequestForm';
import { useAuth } from '@/contexts/AuthProvider';

export default function UserRoleSection() {
  const { user, profile } = useAuth();
  const [showRoleForm, setShowRoleForm] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'superadmin': return '#7c3aed';
      case 'moderator': return '#f59e0b';
      case 'verified': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const currentRole = profile?.role || 'user';
  const canRequestRole = !['admin', 'superadmin'].includes(currentRole);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={20} color="#6b7280" />
        <Text style={styles.title}>Role & Permissions</Text>
      </View>

      <View style={styles.currentRole}>
        <Text style={styles.roleLabel}>Current Role:</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(currentRole) }]}>
          <Text style={styles.roleText}>{getRoleDisplayName(currentRole)}</Text>
        </View>
      </View>

      {canRequestRole && (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => setShowRoleForm(true)}
        >
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.requestGradient}>
            <Shield size={18} color="#ffffff" />
            <Text style={styles.requestText}>Request Role Change</Text>
            <ChevronRight size={18} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.permissions}>
        <Text style={styles.permissionsTitle}>Current Permissions:</Text>
        <View style={styles.permissionsList}>
          <Text style={styles.permissionItem}>• View and interact with deals</Text>
          <Text style={styles.permissionItem}>• Post comments and vote</Text>
          {currentRole === 'verified' && (
            <Text style={styles.permissionItem}>• Verified badge display</Text>
          )}
          {currentRole === 'moderator' && (
            <>
              <Text style={styles.permissionItem}>• Moderate content</Text>
              <Text style={styles.permissionItem}>• Review reported content</Text>
            </>
          )}
          {['admin', 'superadmin'].includes(currentRole) && (
            <>
              <Text style={styles.permissionItem}>• Full admin access</Text>
              <Text style={styles.permissionItem}>• Manage users and content</Text>
            </>
          )}
        </View>
      </View>

      <RoleRequestForm
        visible={showRoleForm}
        onClose={() => setShowRoleForm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  currentRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  requestButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  requestGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  requestText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  permissions: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  permissionsList: {
    gap: 4,
  },
  permissionItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
