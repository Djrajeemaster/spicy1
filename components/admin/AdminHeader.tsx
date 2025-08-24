// components/admin/AdminHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { UserRole } from '@/types/user';
import { router } from 'expo-router';

interface AdminHeaderProps {
  currentUserRole: UserRole;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ currentUserRole }) => {
  const handleExitAdmin = () => {
    // Temporarily bypass Alert.alert to test direct navigation
    console.log('Attempting to exit admin mode directly...');
    router.replace('/');
    
    /* Original code (commented out for testing):
    Alert.alert(
      'Exit Admin Mode',
      'Return to normal user view?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => router.replace('/') }
      ]
    );
    */
  };

  return (
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
        >
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 12,
    marginRight: 8,
  },
  exitButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
