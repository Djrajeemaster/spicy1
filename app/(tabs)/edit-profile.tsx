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
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
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



  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to edit your profile.');
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl.trim() || null;
      if (localAvatarUri) {
        const { publicUrl, error: uploadErr } = await storageService.uploadImage(localAvatarUri, `avatars/${user.id}`, 'public');
        if (uploadErr) throw uploadErr;
        finalAvatarUrl = publicUrl || finalAvatarUrl;
      }

      const updates: Database['public']['Tables']['users']['Update'] = {
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
        router.push('/(tabs)/settings');
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
    <View style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/settings')}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

            <View style={styles.avatarSection}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.avatarGradient}>
                <Image
                  source={{ uri: localAvatarUri || avatarUrl || `https://ui-avatars.com/api/?name=${username || 'U'}&background=random&color=fff` }}
                  style={styles.profileAvatar}
                />
              </LinearGradient>
              <TouchableOpacity onPress={pickImage} style={styles.uploadBtn}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.uploadBtnGradient}>
                  <ImageIcon size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.uploadBtnText}>Change Photo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputContainer}>
                  <User size={20} color="#6366f1" style={styles.inputIcon} />
                  <Text style={styles.displayText}>{username}</Text>
                </View>
                <Text style={styles.hintText}>Username cannot be changed for security reasons.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#6366f1" style={styles.inputIcon} />
                  <Text style={styles.displayText}>{email}</Text>
                </View>
                <Text style={styles.hintText}>Email cannot be changed for security reasons.</Text>
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
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { paddingBottom: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
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
  
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e2e8f0',
  },
  uploadBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  form: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
  hintText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    marginLeft: 4,
  },
  
  displayText: {
    flex: 1,
    fontSize: 16,
    color: '#64748b',
    paddingVertical: 16,
    fontWeight: '500',
  },
  
  saveButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  saveButton: {
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
