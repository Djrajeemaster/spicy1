import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Send, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthProvider';

interface RoleRequestFormProps {
  visible: boolean;
  onClose: () => void;
}

export default function RoleRequestForm({ visible, onClose }: RoleRequestFormProps) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchAvailableRoles();
    }
  }, [visible]);

  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/role-requests/available-roles');
      const roles = await response.json();
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Error fetching available roles:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRole || !reason.trim()) {
      Alert.alert('Error', 'Please select a role and provide a reason');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/role-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          role: selectedRole,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Role request submitted successfully');
        setSelectedRole('');
        setReason('');
        onClose();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
          <Shield size={24} color="#ffffff" />
          <Text style={styles.headerTitle}>Request Role Change</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.content}>
          <Text style={styles.label}>Select Role</Text>
          <View style={styles.roleOptions}>
            {availableRoles.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleOption,
                  selectedRole === role && styles.roleOptionSelected
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[
                  styles.roleOptionText,
                  selectedRole === role && styles.roleOptionTextSelected
                ]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Reason for Request</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please explain why you are requesting this role change..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']}
              style={styles.submitGradient}
            >
              <Send size={20} color="#ffffff" />
              <Text style={styles.submitText}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roleOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#f9fafb',
    marginBottom: 24,
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});