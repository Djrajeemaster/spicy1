import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  X,
  Ban,
  CheckCircle,
  Shield,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { adminUserService } from '@/services/adminUserService';
import { elevate } from '@/services/adminElevation';

interface BulkActionModalProps {
  visible: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  onActionComplete: () => void;
}

type BulkActionType = 'ban' | 'unban' | 'verify' | 'unverify' | 'suspend' | 'delete';

export default function BulkActionModal({ 
  visible, 
  onClose, 
  selectedUserIds, 
  onActionComplete 
}: BulkActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<BulkActionType | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBulkAction = async () => {
    if (!selectedAction || !reason.trim()) {
      Alert.alert('Error', 'Please select an action and provide a reason');
      return;
    }

    if ((selectedAction === 'ban' || selectedAction === 'suspend') && !duration.trim()) {
      Alert.alert('Error', 'Please specify duration for ban/suspend action');
      return;
    }

    try {
      setLoading(true);
      const elevation = await elevate(15); // Longer elevation for bulk actions

      const result = await adminUserService.bulkUserAction({
        userIds: selectedUserIds,
        action: selectedAction,
        reason: reason.trim(),
        elevationToken: elevation.token,
        duration: duration ? parseInt(duration) : undefined,
      });

      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.length - successCount;
        
        Alert.alert(
          'Bulk Action Complete',
          `Successfully processed ${successCount} users${failCount > 0 ? `, ${failCount} failed` : ''}`
        );
        
        onActionComplete();
        onClose();
        resetForm();
      } else {
        Alert.alert('Error', 'Bulk action failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedAction(null);
    setReason('');
    setDuration('');
  };

  const actionOptions = [
    { 
      id: 'ban' as BulkActionType, 
      label: 'Ban Users', 
      icon: Ban, 
      color: '#ef4444',
      description: 'Temporarily or permanently ban selected users'
    },
    { 
      id: 'unban' as BulkActionType, 
      label: 'Unban Users', 
      icon: CheckCircle, 
      color: '#10b981',
      description: 'Remove ban from selected users'
    },
    { 
      id: 'verify' as BulkActionType, 
      label: 'Verify Users', 
      icon: Shield, 
      color: '#4f46e5',
      description: 'Mark selected users as verified'
    },
    { 
      id: 'unverify' as BulkActionType, 
      label: 'Unverify Users', 
      icon: XCircle, 
      color: '#6b7280',
      description: 'Remove verification from selected users'
    },
    { 
      id: 'suspend' as BulkActionType, 
      label: 'Suspend Users', 
      icon: Clock, 
      color: '#f59e0b',
      description: 'Temporarily suspend selected users'
    },
    { 
      id: 'delete' as BulkActionType, 
      label: 'Delete Users', 
      icon: Trash2, 
      color: '#dc2626',
      description: 'Soft delete selected users (can be restored)'
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Bulk Action ({selectedUserIds.length} users)
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Select Action</Text>
          <View style={styles.actionGrid}>
            {actionOptions.map((option) => {
              const IconComponent = option.icon;
              const isSelected = selectedAction === option.id;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.actionOption,
                    isSelected && { borderColor: option.color, backgroundColor: `${option.color}15` }
                  ]}
                  onPress={() => setSelectedAction(option.id)}
                >
                  <IconComponent 
                    size={24} 
                    color={isSelected ? option.color : '#6b7280'} 
                  />
                  <Text style={[
                    styles.actionLabel,
                    isSelected && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.actionDescription}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedAction && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Action Details</Text>
              
              <Text style={styles.label}>Reason *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Provide a reason for this bulk action..."
                placeholderTextColor="#94a3b8"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />

              {(selectedAction === 'ban' || selectedAction === 'suspend') && (
                <View>
                  <Text style={styles.label}>
                    Duration (days) {selectedAction === 'suspend' ? '*' : '(optional for permanent ban)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 7, 30, 90"
                    placeholderTextColor="#94a3b8"
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ This action will be applied to {selectedUserIds.length} users. 
                  This action cannot be easily undone for all users at once.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.executeBtn,
                  !reason.trim() && styles.executeBtnDisabled
                ]}
                onPress={handleBulkAction}
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.executeBtnText}>
                    Execute Bulk Action
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  actionGrid: {
    gap: 12,
    marginBottom: 24,
  },
  actionOption: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    height: 80,
    textAlignVertical: 'top',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    lineHeight: 20,
  },
  executeBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  executeBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  executeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
