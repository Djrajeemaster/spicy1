import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { bannerService } from '@/services/bannerService';

export default function AddBannerScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleAddBanner = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await bannerService.createBanner({
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl.trim() || 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=400',
        is_active: true,
        priority: parseInt(priority) || 1,
      });
      
      if (error) throw error;

      Alert.alert('Success', 'Banner created successfully');
      setTimeout(() => {
        // Navigate to admin screen with banners tab active
        router.replace({
          pathname: '/(tabs)/admin',
          params: { tab: 'banners' }
        });
      }, 1000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create banner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/admin')} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Banner</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter banner title"
            autoComplete="off"
            textContentType="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter banner description"
            multiline
            numberOfLines={3}
            autoComplete="off"
            textContentType="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Image URL (optional)</Text>
          <TextInput
            style={styles.input}
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://example.com/image.jpg"
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
          <TextInput
            style={styles.input}
            value={priority}
            onChangeText={setPriority}
            placeholder="1"
            keyboardType="numeric"
            autoComplete="off"
            textContentType="none"
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleAddBanner}
          disabled={loading}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGradient}>
            <ImageIcon size={20} color="#FFFFFF" />
            <Text style={styles.submitText}>
              {loading ? 'Creating...' : 'Create Banner'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  form: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});