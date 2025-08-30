import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthProvider';
import { canEditAnyDeal } from '@/utils/adminUtils';
import { supabase } from '@/lib/supabase';

export default function TestAdminScreen() {
  const { user, profile } = useAuth();

  const makeUserAdmin = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      const { error } = await (supabase
        .from('users') as any)
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', `Failed to update role: ${error.message}`);
      } else {
        Alert.alert('Success', 'User role updated to admin. Please refresh the app.');
      }
    } catch (err) {
      Alert.alert('Error', 'Unexpected error occurred');
    }
  };

  const makeUserSuperAdmin = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      const { error } = await (supabase
        .from('users') as any)
        .update({ role: 'super_admin' })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', `Failed to update role: ${error.message}`);
      } else {
        Alert.alert('Success', 'User role updated to super admin. Please refresh the app.');
      }
    } catch (err) {
      Alert.alert('Error', 'Unexpected error occurred');
    }
  };

  const makeUserRegular = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    try {
      const { error } = await (supabase
        .from('users') as any)
        .update({ role: 'user' })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', `Failed to update role: ${error.message}`);
      } else {
        Alert.alert('Success', 'User role updated to regular user. Please refresh the app.');
      }
    } catch (err) {
      Alert.alert('Error', 'Unexpected error occurred');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Admin Testing Panel</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current User Info</Text>
          <Text style={styles.info}>Email: {user?.email || 'Not logged in'}</Text>
          <Text style={styles.info}>User ID: {user?.id || 'N/A'}</Text>
          <Text style={styles.info}>Profile Role: {profile?.role || 'No role set'}</Text>
          <Text style={styles.info}>Username: {profile?.username || 'No username'}</Text>
          <Text style={styles.info}>Can Edit Any Deal: {canEditAnyDeal(profile?.role) ? 'YES' : 'NO'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role Management</Text>
          <TouchableOpacity style={styles.button} onPress={makeUserRegular}>
            <Text style={styles.buttonText}>Make Regular User</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={makeUserAdmin}>
            <Text style={styles.buttonText}>Make Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={makeUserSuperAdmin}>
            <Text style={styles.buttonText}>Make Super Admin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <Text style={styles.info}>Profile Object:</Text>
          <Text style={styles.code}>{JSON.stringify(profile, null, 2)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  code: {
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
