import React, { useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, MapPin, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { userService } from '@/services/userService';
import { Database } from '@/types/database';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { storageService } from '@/services/storageService';

type UserProfile = Database['public']['Tables']['users']['Row'];

export default function EditProfileScreen() {
  const { user, profile, fetchProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null); // NEW (upload)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailChangeMode, setEmailChangeMode] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setNewEmail(profile.email || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
      setLoading(false);
    } else if (!user) {
      router.replace('/sign-in');
    }
  }, [profile, user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to upload an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const handleEmailChange = async () => {
    if (!user?.id || !newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (newEmail === email) {
      setEmailChangeMode(false);
      return;
    }

    Alert.alert(
      'Change Email',
      'Changing your email will require verification. You will receive a confirmation email at your new address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
              if (error) {
                Alert.alert('Error', `Failed to update email: ${error.message}`);
              } else {
                Alert.alert('Verification Required', 'A verification email has been sent to your new email address.', [
                  { text: 'OK', onPress: () => setEmailChangeMode(false) }
                ]);
              }
            } catch (error) {
              console.error('Error updating email:', error);
              Alert.alert('Error', 'Failed to update email address.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to edit your profile.');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      // If user selected a local image, upload it and replace avatarUrl
      let finalAvatarUrl = avatarUrl.trim() || null;
      if (localAvatarUri) {
        const { publicUrl, error: uploadErr } = await storageService.uploadImage(localAvatarUri, `avatars/${user.id}`, 'public');
        if (uploadErr) throw uploadErr;
        finalAvatarUrl = publicUrl || finalAvatarUrl;
      }

      const updates: Database['public']['Tables']['users']['Update'] = {
        username: username.trim(),
        location: location.trim() || null,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await userService.updateProfile(user.id, updates);
      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', `Failed to update profile: ${error.message}`);
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
        if (fetchProfile) await fetchProfile(user);
        router.back();
      }
    } catch (error) {
      console.error('Unexpected error saving profile:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Update your personal information</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.avatarSection}>
              <Image
                source={{ uri: localAvatarUri || avatarUrl || `https://ui-avatars.com/api/?name=${username || 'U'}&background=random&color=fff` }}
                style={styles.profileAvatar}
              />
              <Text style={styles.avatarHint}>Your profile picture</Text>
              <TouchableOpacity onPress={pickImage} style={[styles.uploadBtn, { marginTop: 10 }]}>
                <Text style={styles.uploadBtnText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#6366f1" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#6366f1" style={styles.inputIcon} />
                {emailChangeMode ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#94a3b8"
                  />
                ) : (
                  <Text style={styles.emailDisplay}>{email}</Text>
                )}
                <TouchableOpacity
                  style={styles.emailChangeButton}
                  onPress={emailChangeMode ? handleEmailChange : () => setEmailChangeMode(true)}
                >
                  <Text style={styles.emailChangeText}>
                    {emailChangeMode ? 'Save' : 'Change'}
                  </Text>
                </TouchableOpacity>
              </View>
              {emailChangeMode && (
                <View style={styles.emailActions}>
                  <TouchableOpacity
                    style={styles.cancelEmailButton}
                    onPress={() => {
                      setEmailChangeMode(false);
                      setNewEmail(email);
                    }}
                  >
                    <Text style={styles.cancelEmailText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.hintText}>
                {emailChangeMode ? 'Email changes require verification.' : 'Tap "Change" to update your email address.'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#6366f1" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., New York, USA"
                  value={location}
                  onChangeText={setLocation}
                  autoCapitalize="words"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Avatar URL</Text>
              <View style={styles.inputContainer}>
                <ImageIcon size={20} color="#6366f1" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Link to your profile picture"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.hintText}>Paste a direct image URL or use the Upload button above.</Text>
            </View>

            <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleSaveProfile} disabled={saving}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.saveButton}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Profile</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  backButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  profileAvatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#e2e8f0', marginBottom: 10,
    borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  avatarHint: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  uploadBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  uploadBtnText: { color: '#334155', fontWeight: '700' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 2, borderColor: '#e2e8f0', paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1e293b', paddingVertical: 16, fontWeight: '500' },
  hintText: { fontSize: 13, color: '#94a3b8', marginTop: 8, marginLeft: 4 },
  emailDisplay: { flex: 1, fontSize: 16, color: '#64748b', paddingVertical: 16, fontWeight: '500' },
  emailChangeButton: { backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  emailChangeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emailActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelEmailButton: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cancelEmailText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  saveButtonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 20 },
  saveButton: { paddingVertical: 16, alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
