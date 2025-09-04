import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Plus, Settings } from 'lucide-react-native';
import { apiClient } from '@/utils/apiClient';

interface Role {
  name: string;
  description: string;
  permissions: string[];
}

export const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([
    {
      name: 'user',
      description: 'Standard user with basic permissions',
      permissions: ['view_deals', 'post_comments', 'vote']
    },
    {
      name: 'verified',
      description: 'Verified user with additional credibility',
      permissions: ['view_deals', 'post_comments', 'vote', 'verified_badge']
    },
    {
      name: 'moderator',
      description: 'Content moderator with moderation powers',
      permissions: ['view_deals', 'post_comments', 'vote', 'moderate_content', 'review_reports']
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: '' });

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const permissions = newRole.permissions.split(',').map(p => p.trim()).filter(p => p);
      
      const response = await apiClient.post('/roles', {
        name: newRole.name,
        description: newRole.description,
        permissions
      }) as Response;

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Role created successfully');
        setRoles([...roles, { ...newRole, permissions }]);
        setNewRole({ name: '', description: '', permissions: '' });
        setShowCreateForm(false);
      } else {
        Alert.alert('Error', data.error || 'Failed to create role');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Role Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.createGradient}>
            <Plus size={18} color="#ffffff" />
            <Text style={styles.createText}>Create Role</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {showCreateForm && (
          <View style={styles.createForm}>
            <Text style={styles.formTitle}>Create New Role</Text>
            
            <Text style={styles.label}>Role Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter role name"
              value={newRole.name}
              onChangeText={(text) => setNewRole({ ...newRole, name: text })}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter role description"
              value={newRole.description}
              onChangeText={(text) => setNewRole({ ...newRole, description: text })}
            />

            <Text style={styles.label}>Permissions (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., view_deals, post_comments, moderate_content"
              value={newRole.permissions}
              onChangeText={(text) => setNewRole({ ...newRole, permissions: text })}
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateForm(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateRole}
              >
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.saveGradient}>
                  <Text style={styles.saveText}>Create Role</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.rolesGrid}>
          {roles.map((role, index) => (
            <View key={index} style={styles.roleCard}>
              <View style={styles.roleHeader}>
                <Shield size={20} color="#6366f1" />
                <Text style={styles.roleName}>{role.name.toUpperCase()}</Text>
              </View>
              
              <Text style={styles.roleDescription}>{role.description}</Text>
              
              <View style={styles.permissionsSection}>
                <Text style={styles.permissionsTitle}>Permissions:</Text>
                <View style={styles.permissionsList}>
                  {role.permissions.map((permission, permIndex) => (
                    <View key={permIndex} style={styles.permissionTag}>
                      <Text style={styles.permissionText}>{permission}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  createText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  createForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#f9fafb',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  saveButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});