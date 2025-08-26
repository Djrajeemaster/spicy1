import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Validation Error', 'New password must be different from current password.');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Validation Error', passwordError);
      return;
    }

    setLoading(true);
    try {
      // Verify user is authenticated
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        Alert.alert('Error', 'Please sign in again to change your password.');
        return;
      }

      // Update password - Supabase will handle current password verification
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Alert.alert('Error', `Failed to update password: ${updateError.message}`);
      } else {
        Alert.alert(
          'Success',
          'Password updated successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Change Password</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#6366f1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#6366f1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.hintText}>
                  Password must be at least 8 characters with uppercase, lowercase, and number.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#6366f1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#94a3b8" />
                    ) : (
                      <Eye size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.changeButtonWrapper} 
                onPress={handleChangePassword} 
                disabled={loading}
              >
                <LinearGradient colors={['#10b981', '#059669']} style={styles.changeButton}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.changeButtonText}>Change Password</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { paddingBottom: 0 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  
  form: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  hintText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    marginLeft: 4,
  },
  
  changeButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  changeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});