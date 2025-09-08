import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { bannerService } from '@/services/bannerService';

export default function EditBannerScreen() {
  const params = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  console.log('=== EDIT BANNER SCREEN INITIALIZED ===');
  console.log('Initial params:', params);

  useEffect(() => {
    console.log('EditBanner: useEffect triggered with params:', params);
    console.log('EditBanner: Current state before update:', { title, description, imageUrl, priority, isActive });

    // Pre-fill form with existing banner data
    if (params.title) setTitle(params.title as string);
    if (params.description) setDescription(params.description as string);
    if (params.imageUrl) setImageUrl(params.imageUrl as string);
    if (params.priority) setPriority(params.priority as string);
    if (params.isActive) setIsActive(params.isActive === 'true');

    console.log('EditBanner: Form state after update:', { title, description, imageUrl, priority, isActive });
  }, [params.title, params.description, params.imageUrl, params.priority, params.isActive]);

  const handleUpdateBanner = async () => {
    console.log('=== UPDATE BANNER CALLED ===');
    console.log('Current form values:');
    console.log('- Title:', title);
    console.log('- Description:', description);
    console.log('- Image URL:', imageUrl);
    console.log('- Priority:', priority);
    console.log('- Is Active:', isActive);

    if (!title.trim() || !description.trim()) {
      console.log('Validation failed: missing title or description');
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    if (!params.bannerId) {
      console.log('Validation failed: missing bannerId');
      Alert.alert('Error', 'Banner ID not found');
      return;
    }

    console.log('Validation passed, proceeding with update...');

    try {
      setLoading(true);

      const updates = {
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl.trim() || null,
        priority: parseInt(priority) || 1,
        is_active: isActive,
      };

      console.log('Sending updates:', updates);

      const { error } = await bannerService.updateBanner(params.bannerId as string, updates);

      if (error) {
        console.log('Update error:', error);
        throw error;
      }

      console.log('Update successful');
      Alert.alert('Success', 'Banner updated successfully');
      setTimeout(() => router.replace('/(tabs)/admin'), 1000);
    } catch (error: any) {
      console.log('Update failed with error:', error);
      Alert.alert('Error', error.message || 'Failed to update banner');
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
        <Text style={styles.title}>Edit Banner</Text>
        <TouchableOpacity onPress={handleUpdateBanner} style={styles.saveButton} disabled={loading}>
          <Save size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            key="title-input"
            style={styles.input}
            value={title}
            onChangeText={(text) => {
              // Only log if text actually changed and is not empty
              if (text !== title && text.length > 0) {
                console.log('Title changed to:', text);
              }
              setTitle(text);
            }}
            placeholder="Enter banner title"
            placeholderTextColor="#9CA3AF"
            editable={true}
            selectTextOnFocus={true}
            autoComplete="off"
            textContentType="none"
            autoCapitalize="words"
            autoCorrect={false}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            key="description-input"
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={(text) => {
              // Only log if text actually changed and is not empty
              if (text !== description && text.length > 0) {
                console.log('Description changed to:', text);
              }
              setDescription(text);
            }}
            placeholder="Enter banner description"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={true}
            selectTextOnFocus={true}
            autoComplete="off"
            textContentType="none"
            autoCapitalize="sentences"
            autoCorrect={true}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Image URL</Text>
          <TextInput
            key="image-url-input"
            style={styles.input}
            value={imageUrl}
            onChangeText={(text) => {
              // Only log if text actually changed and is not empty
              if (text !== imageUrl && text.length > 0) {
                console.log('Image URL changed to:', text);
              }
              setImageUrl(text);
            }}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor="#9CA3AF"
            editable={true}
            selectTextOnFocus={true}
            autoComplete="off"
            textContentType="none"
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
          <TextInput
            key="priority-input"
            style={styles.input}
            value={priority}
            onChangeText={(text) => {
              // Only log if text actually changed and is not empty
              if (text !== priority && text.length > 0) {
                console.log('Priority changed to:', text);
              }
              setPriority(text);
            }}
            placeholder="1"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            editable={true}
            selectTextOnFocus={true}
            autoComplete="off"
            textContentType="none"
            maxLength={3}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[styles.statusButton, !isActive && styles.statusButtonActive]}
              onPress={() => {
                console.log('Inactive button pressed, current isActive:', isActive);
                setIsActive(false);
                console.log('isActive set to false');
              }}
            >
              <Text style={[styles.statusText, !isActive && styles.statusTextActive]}>Inactive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, isActive && styles.statusButtonActive]}
              onPress={() => {
                console.log('Active button pressed, current isActive:', isActive);
                setIsActive(true);
                console.log('isActive set to true');
              }}
            >
              <Text style={[styles.statusText, isActive && styles.statusTextActive]}>Active</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug button to test form state */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={[styles.updateButton, loading && styles.updateButtonDisabled]}
            onPress={() => {
              console.log('=== DEBUG FORM STATE ===');
              console.log('Title:', title);
              console.log('Description:', description);
              console.log('Image URL:', imageUrl);
              console.log('Priority:', priority);
              console.log('Is Active:', isActive);
              console.log('=======================');
            }}
          >
            <View style={styles.updateButtonGradient}>
              <Text style={styles.updateButtonText}>Debug Form State</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, loading && styles.updateButtonDisabled]}
          onPress={() => {
            console.log('Update button pressed');
            handleUpdateBanner();
          }}
          disabled={loading}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.updateButtonGradient}
          >
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating...' : 'Update Banner'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  statusButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  statusButtonActive: {
    backgroundColor: '#3B82F6',
  },
  statusText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  updateButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
