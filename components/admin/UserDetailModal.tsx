import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  X,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RotateCcw,
  Key,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Eye,
  ArrowLeft,
} from 'lucide-react-native';
import { adminUserService, BanUserRequest, UserActionRequest } from '@/services/adminUserService';
import { elevate } from '@/services/adminElevation';
import { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthProvider';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface UserDetailModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onUserUpdated: () => void;
}

interface UserStats {
  user: UserProfile;
  stats: {
    total_deals: number;
    total_comments: number;
    total_votes_given: number;
    total_votes_received: number;
    account_age_days: number;
    last_activity: string;
    is_banned: boolean;
    is_suspended: boolean;
    ban_expiry?: string;
    suspend_expiry?: string;
  };
}

export default function UserDetailModal({ visible, onClose, userId, onUserUpdated }: UserDetailModalProps) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const { profile: currentAdminProfile } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionForm, setShowActionForm] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('');
  const [hardDelete, setHardDelete] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [validationError, setValidationError] = useState('');

  // Check if current admin is super admin
  const isSuperAdmin = currentAdminProfile?.role === 'superadmin';

  const setActionFormAndClearError = (actionType: string | null) => {
    setValidationError(''); // Clear any previous validation errors
    setShowActionForm(actionType);
  };

  useEffect(() => {
    if (visible && userId) {
      loadUserStats();
    }
  }, [visible, userId]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const stats = await adminUserService.getUserStats(userId);
      setUserStats(stats);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load user stats');
    } finally {
      setLoading(false);
    }
  };

  const debugAuth = () => {
    Alert.alert(
      'Debug Auth Info',
      JSON.stringify({
        hasProfile: !!currentAdminProfile,
        role: currentAdminProfile?.role,
        email: currentAdminProfile?.email,
        id: currentAdminProfile?.id,
        isSuperAdmin
      }, null, 2)
    );
  };

  const handleAction = async (actionType: string) => {
    setValidationError(''); // Clear previous errors

    // Validate required fields before making any API calls
    if (!isSuperAdmin && !actionReason.trim()) {
      const errorMsg = 'Please provide a reason for this action';
      setValidationError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    // Validate action-specific required fields
    if (actionType === 'suspend' && !suspendDuration.trim()) {
      const errorMsg = 'Please specify suspend duration (in days)';
      setValidationError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    if (actionType === 'suspend' && (isNaN(parseInt(suspendDuration)) || parseInt(suspendDuration) <= 0)) {
      const errorMsg = 'Please enter a valid suspend duration (must be a positive number)';
      setValidationError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    if (actionType === 'ban' && banDuration && (isNaN(parseInt(banDuration)) || parseInt(banDuration) <= 0)) {
      const errorMsg = 'Please enter a valid ban duration (must be a positive number)';
      setValidationError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    if (actionType === 'changeRole' && !newRole) {
      const errorMsg = 'Please select a new role';
      setValidationError(errorMsg);
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    try {
      setActionLoading(true);
      
      const elevationToken = await elevate(10);
      
      let result;
      const baseRequest: UserActionRequest = {
        userId,
        elevationToken: elevationToken,
        reason: actionReason || 'Action performed by super admin',
      };

      switch (actionType) {
        case 'ban':
          const banRequest: BanUserRequest = {
            ...baseRequest,
            banReason: actionReason || 'Banned by super admin',
            banDuration: banDuration ? parseInt(banDuration) : undefined,
          };
          result = await adminUserService.banUser(banRequest);
          break;
        case 'unban':
          result = await adminUserService.unbanUser(baseRequest);
          break;
        case 'changeRole':
          result = await adminUserService.changeUserRole({
            ...baseRequest,
            newRole,
          });
          break;
        case 'suspend':
          result = await adminUserService.suspendUser({
            ...baseRequest,
            suspendDays: parseInt(suspendDuration),
          });
          break;
        case 'unsuspend':
          result = await adminUserService.unsuspendUser(baseRequest);
          break;
        case 'delete':
          result = await adminUserService.deleteUser({
            ...baseRequest,
            hardDelete,
          });
          break;
        case 'restore':
          result = await adminUserService.restoreUser(baseRequest);
          break;
        case 'resetPassword':
          result = await adminUserService.resetUserPassword(baseRequest);
          if (result.tempPassword) {
            setTempPassword(result.tempPassword);
            Alert.alert('Password Reset', `Temporary password: ${result.tempPassword}`);
          } else if (result.success && result.message) {
            setTempPassword(null);
            Alert.alert('Password Reset', `${result.message}\n(No temporary password returned)`);
          } else {
            setTempPassword(null);
            Alert.alert('Password Reset', 'Password reset completed, but no temporary password was returned.');
          }
          break;
        case 'changeRole':
          if (!newRole) {
            Alert.alert('Error', 'Please select a new role');
            return;
          }
          result = await adminUserService.changeUserRole({
            ...baseRequest,
            newRole,
          });
          break;
        default:
          throw new Error('Unknown action type');
      }

      if (result.success) {
        Alert.alert('Success', result.message);
        setShowActionForm(null);
        setActionReason('');
        setBanDuration('');
        setSuspendDuration('');
        setHardDelete(false);
        setNewRole('');
        setValidationError(''); // Clear validation error
        loadUserStats();
        onUserUpdated();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionForm = () => {
    // Show temp password if available
    if (tempPassword) {
      return (
        <View style={[styles.actionForm, { marginBottom: 16 }]}> 
          <Text style={styles.actionFormTitle}>Temporary Password</Text>
          <Text selectable style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginVertical: 8, textAlign: 'center' }}>{tempPassword}</Text>
          <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>Copy and share this password with the user. They should change it after login.</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setTempPassword(null)}>
            <Text style={styles.confirmBtnText}>Hide Password</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!showActionForm) return null;

    return (
      <View style={styles.actionForm}>
        <Text style={styles.actionFormTitle}>
          {showActionForm.charAt(0).toUpperCase() + showActionForm.slice(1)} User
        </Text>
        
        {/* Validation Error Display */}
        {validationError ? (
          <View style={styles.errorDisplay}>
            <Text style={styles.errorDisplayText}>⚠️ {validationError}</Text>
          </View>
        ) : null}
        
        <TextInput
          style={styles.textArea}
          placeholder={isSuperAdmin ? "Reason for this action (optional)..." : "Reason for this action..."}
          placeholderTextColor="#94a3b8"
          value={actionReason}
          onChangeText={setActionReason}
          multiline
          numberOfLines={3}
        />
        
        {isSuperAdmin && (
          <Text style={styles.superAdminNote}>
            As a super admin, providing a reason is optional but recommended for audit purposes.
          </Text>
        )}

        {showActionForm === 'ban' && (
          <View>
            <Text style={styles.label}>Ban Duration (days, leave empty for permanent)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 7, 30, 90"
              placeholderTextColor="#94a3b8"
              value={banDuration}
              onChangeText={setBanDuration}
              keyboardType="numeric"
            />
          </View>
        )}

        {showActionForm === 'suspend' && (
          <View>
            <Text style={styles.label}>Suspend Duration (days) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3, 7, 14"
              placeholderTextColor="#94a3b8"
              value={suspendDuration}
              onChangeText={setSuspendDuration}
              keyboardType="numeric"
            />
          </View>
        )}

        {(showActionForm === 'unsuspend' || showActionForm === 'unban') && (
          <View>
            <Text style={styles.actionNote}>
              This action will {showActionForm} the user immediately.
            </Text>
          </View>
        )}

        {showActionForm === 'changeRole' && (
          <View>
            <Text style={styles.label}>New Role *</Text>
            <View style={styles.roleContainer}>
              {['user', 'verified', 'business', 'moderator', 'admin', 'superadmin'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    newRole === role && styles.roleOptionSelected,
                  ]}
                  onPress={() => setNewRole(role)}
                >
                  <Text style={[
                    styles.roleOptionText,
                    newRole === role && styles.roleOptionTextSelected,
                  ]}>
                    {role === 'verified' ? 'Verified User' : 
                     role === 'superadmin' ? 'Super Admin' : 
                     role === 'business' ? 'Business User' :
                     role === 'moderator' ? 'Moderator' :
                     role === 'admin' ? 'Admin' :
                     'Regular User'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.currentRoleText}>
              Current role: {userStats?.user.role}
            </Text>
          </View>
        )}

        {showActionForm === 'delete' && (
          <View style={styles.switchRow}>
            <Text style={styles.label}>Hard Delete (cannot be undone)</Text>
            <Switch
              value={hardDelete}
              onValueChange={setHardDelete}
              trackColor={{ false: '#e5e7eb', true: '#ef4444' }}
              thumbColor={hardDelete ? '#fff' : '#fff'}
            />
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setActionFormAndClearError(null)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => handleAction(showActionForm)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUserActions = () => {
    if (!userStats) return null;

    const { stats } = userStats;
    
    // Prevent any admin actions on superadmin accounts
    if (userStats?.user.role === 'superadmin') {
      return (
        <View style={styles.actionsGrid}>
          <Text style={styles.sectionTitle}>User Actions</Text>
          <View style={styles.actionGrid}>
            <Text style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center', marginVertical: 16 }}>
              Superadmin accounts cannot be managed, banned, suspended, or deleted.
            </Text>
          </View>
        </View>
      );
    }
    // ...existing code for other roles...
    return (
      <View style={styles.actionsGrid}>
        <Text style={styles.sectionTitle}>User Actions</Text>
        <View style={styles.actionGrid}>
          {/* Ban/Unban and Suspend/Unsuspend available to all admins */}
          {!stats?.is_banned ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={() => setShowActionForm('ban')}
            >
              <Ban size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Ban User</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.successBtn]}
              onPress={() => setShowActionForm('unban')}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Unban User</Text>
            </TouchableOpacity>
          )}

          {!stats?.is_suspended ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.warningBtn]}
              onPress={() => setActionFormAndClearError('suspend')}
            >
              <Clock size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Suspend</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.successBtn]}
              onPress={() => setShowActionForm('unsuspend')}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Unsuspend User</Text>
            </TouchableOpacity>
          )}

          {/* Superadmin-only actions */}
          {isSuperAdmin && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.infoBtn]}
                onPress={() => setShowActionForm('resetPassword')}
              >
                <Key size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Reset Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.warningBtn]}
                onPress={() => setShowActionForm('changeRole')}
              >
                <User size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Change Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.dangerBtn]}
                onPress={() => setShowActionForm('delete')}
              >
                <Trash2 size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>User Details</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading user details...</Text>
          </View>
        ) : userStats ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={styles.userHeader}>
                <View style={styles.avatar}>
                  <User size={32} color="#6b7280" />
                </View>
                <View style={styles.userMeta}>
                  <Text style={styles.username}>{userStats.user.username}</Text>
                  <Text style={styles.email}>{userStats.user.email}</Text>
                  <View style={styles.statusRow}>
                    <Text style={[styles.status, userStats.stats?.is_banned && styles.statusBanned]}>
                      {userStats.stats?.is_banned ? 'BANNED' : userStats.stats?.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                    </Text>
                    <Text style={styles.role}>{userStats.user.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <Text style={styles.sectionTitle}>Statistics</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MessageSquare size={20} color="#0ea5e9" />
                  <Text style={styles.statValue}>{userStats.stats?.total_deals || 0}</Text>
                  <Text style={styles.statLabel}>Deals</Text>
                </View>
                <View style={styles.statItem}>
                  <MessageSquare size={20} color="#10b981" />
                  <Text style={styles.statValue}>{userStats.stats?.total_comments || 0}</Text>
                  <Text style={styles.statLabel}>Comments</Text>
                </View>
                <View style={styles.statItem}>
                  <ThumbsUp size={20} color="#f59e0b" />
                  <Text style={styles.statValue}>{userStats.stats?.total_votes_received || 0}</Text>
                  <Text style={styles.statLabel}>Upvotes</Text>
                </View>
                <View style={styles.statItem}>
                  <Calendar size={20} color="#8b5cf6" />
                  <Text style={styles.statValue}>{userStats.stats?.account_age_days || 0}</Text>
                  <Text style={styles.statLabel}>Days</Text>
                </View>
              </View>
            </View>

            {/* User Actions */}
            {renderUserActions()}

            {/* Action Form */}
            {renderActionForm()}
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load user details</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
  },
  debugBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  userInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userMeta: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#10b981',
    color: '#fff',
  },
  statusBanned: {
    backgroundColor: '#ef4444',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eef2ff',
    color: '#4338ca',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actionsGrid: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: '45%',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: '#4f46e5',
  },
  secondaryBtn: {
    backgroundColor: '#6b7280',
  },
  successBtn: {
    backgroundColor: '#10b981',
  },
  warningBtn: {
    backgroundColor: '#f59e0b',
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
  },
  infoBtn: {
    backgroundColor: '#0ea5e9',
  },
  actionForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  actionFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionNote: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
    justifyContent: 'space-between',
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    minWidth: '48%',
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  roleOptionTextSelected: {
    color: '#fff',
  },
  currentRoleText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  superAdminNote: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorDisplay: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorDisplayText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
