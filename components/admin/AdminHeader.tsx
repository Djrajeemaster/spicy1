// components/admin/AdminHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Shield, LogOut } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { UserRole } from '@/types/user';
import { router } from 'expo-router';

interface AdminHeaderProps {
  currentUserRole: UserRole;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ currentUserRole }) => {
  const handleExitAdmin = () => {
    console.log('Exit admin button pressed');
    
    // For web, use confirm dialog, for native use Alert
    if (Platform.OS === 'web') {
      const confirmExit = window.confirm('Exit Admin Mode? Return to normal user view?');
      if (confirmExit) {
        console.log('Exiting admin mode...');
        try {
          router.replace('/(tabs)');
          console.log('Successfully navigated to main tabs');
        } catch (error) {
          console.error('Navigation error:', error);
          // Fallback navigation
          router.push('/');
        }
      }
    } else {
      Alert.alert(
        'Exit Admin Mode',
        'Return to normal user view?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('Exit cancelled')
          },
          { 
            text: 'Exit', 
            onPress: () => {
              console.log('Exiting admin mode...');
              try {
                router.replace('/(tabs)');
                console.log('Successfully navigated to main tabs');
              } catch (error) {
                console.error('Navigation error:', error);
                // Fallback navigation
                router.push('/');
              }
            }
          }
        ]
      );
    }
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
});
