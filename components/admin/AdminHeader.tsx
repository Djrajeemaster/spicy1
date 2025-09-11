// components/admin/AdminHeader.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Modal } from 'react-native';
import { Shield, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { UserRole } from '@/types/user';
import { router } from 'expo-router';

interface AdminHeaderProps {
  currentUserRole: UserRole;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ currentUserRole }) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleExitAdmin = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = async () => {
    setExiting(true);
    try {
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      router.push('/');
    } finally {
      setExiting(false);
      setShowExitConfirm(false);
    }
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  return (
    <>
      <LinearGradient
        colors={['#1f2937', '#111827']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Shield size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <UserBadge role={currentUserRole} size="small" />
          </View>
          
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={handleExitAdmin}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="Exit admin mode"
            accessibilityRole="button"
          >
            <LogOut size={18} color="#FFFFFF" />
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitConfirm}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Exit Admin Mode</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to return to normal user view?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={cancelExit}
                disabled={exiting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={confirmExit}
                disabled={exiting}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modalConfirmGradient}
                >
                  {exiting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Exit</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 12,
    marginRight: 16,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 4,
    minWidth: 60,
    justifyContent: 'center',
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalBtn: {
    marginLeft: 10,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '700',
  },
  modalConfirm: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '800',
  },
});