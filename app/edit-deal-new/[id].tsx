import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  DollarSign,
  Calendar,
  Shield,
  CircleCheck as CheckCircle,
  Sparkles,
  Upload,
  Zap,
  X,
  ArrowLeft,
  Save,
  Trash2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService, DealWithRelations } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { storageService } from '@/services/storageService';
import { Database } from '@/types/database';
import * as ImagePicker from 'expo-image-picker';

type Category = Database['public']['Tables']['categories']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

export default function EditDealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    selectedCategoryId: '',
    selectedStoreId: '',
    city: '',
    state: '',
    country: '',
    expiryDate: '',
    dealUrl: '',
    couponCode: '',
  });

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const isWeb = Platform.OS === 'web';
  const [notice, setNotice] = useState<{
    type: 'error' | 'success' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const notify = (title: string, message: string, type: 'error' | 'success' | 'info' = 'error') => {
    if (isWeb) setNotice({ type, title, message });
    else Alert.alert(title, message);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || !user) return;

    try {
      setDataLoading(true);

      // Load deal data
      const [dealError, dealData] = await dealService.getDealById(id);
      
      if (dealError || !dealData) {
        Alert.alert('Error', 'Deal not found');
        router.back();
        return;
      }

      // Check if user owns this deal
      if (dealData.created_by !== user.id) {
        Alert.alert('Access Denied', 'You can only edit your own deals');
        router.back();
        return;
      }

      setDeal(dealData);

      // Load categories and stores
      const categoriesResult = await categoryService.getCategories();
      const storesResult = await storeService.getStores();

      if (!categoriesResult.error && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }

      if (!storesResult.error && storesResult.data) {
        setStores(storesResult.data);
      }

      // Populate form with deal data
      setFormData({
        title: dealData.title,
        description: dealData.description,
        price: dealData.price.toString(),
        originalPrice: dealData.original_price?.toString() || '',
        selectedCategoryId: dealData.category_id,
        selectedStoreId: dealData.store_id,
        city: dealData.city || '',
        state: dealData.state || '',
        country: dealData.country || '',
        expiryDate: dealData.expiry_date ? dealData.expiry_date.split('T')[0] : '',
        dealUrl: dealData.deal_url || '',
        couponCode: dealData.coupon_code || '',
      });

      setSelectedImages(dealData.images || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load deal data');
      router.back();
    } finally {
      setInitialLoading(false);
      setDataLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!deal || !user) return;

    // Validation - same as create deal
    if (!formData.title.trim()) {
      return notify('Missing Information', 'Please enter a title.');
    }

    if (!formData.description.trim()) {
      return notify('Missing Information', 'Please enter a description.');
    }

    if (!formData.price.trim() || isNaN(Number(formData.price))) {
      return notify('Invalid Price', 'Please enter a valid price.');
    }

    if (formData.originalPrice && isNaN(Number(formData.originalPrice))) {
      return notify('Invalid Price', 'Please enter a valid original price.');
    }

    if (!formData.selectedCategoryId) {
      return notify('Missing Information', 'Please select a category.');
    }

    if (!formData.selectedStoreId) {
      return notify('Missing Information', 'Please select a store.');
    }

    try {
      setLoading(true);

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        original_price: formData.originalPrice ? Number(formData.originalPrice) : null,
        category_id: formData.selectedCategoryId,
        store_id: formData.selectedStoreId,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
        expiry_date: formData.expiryDate || null,
        deal_url: formData.dealUrl.trim() || null,
        coupon_code: formData.couponCode.trim() || null,
        images: selectedImages,
        discount_percentage: formData.originalPrice 
          ? Math.round((1 - Number(formData.price) / Number(formData.originalPrice)) * 100)
          : null
      };

      const [error] = await dealService.updateDeal(deal.id, updateData);
      
      if (error) {
        console.error('Error updating deal:', error);
        notify('Update Failed', error.message || 'Failed to update deal. Please try again.');
        return;
      }

      notify('Success', 'Deal updated successfully!', 'success');
      router.replace(`/deal-details?id=${deal.id}`);
    } catch (error) {
      console.error('Error updating deal:', error);
      notify('Update Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;

    Alert.alert(
      'Delete Deal',
      'Are you sure you want to delete this deal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const [error] = await dealService.deleteDeal(deal.id);
              
              if (error) {
                console.error('Error deleting deal:', error);
                Alert.alert('Error', 'Failed to delete deal');
                return;
              }

              Alert.alert('Success', 'Deal deleted successfully', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/') }
              ]);
            } catch (error) {
              console.error('Error deleting deal:', error);
              Alert.alert('Error', 'Failed to delete deal');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const uploadResult = await storageService.uploadImage(result.assets[0].uri);
        if (uploadResult.data && uploadResult.data.url) {
          setSelectedImages(prev => [...prev, uploadResult.data!.url]);
        } else {
          Alert.alert('Error', 'Failed to upload image');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading deal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Deal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleDelete} 
            style={styles.deleteButton}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash2 size={20} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Sparkles size={16} color="#6366f1" />
            </View>
            <TextInput
              style={styles.inputWithPadding}
              value={formData.title}
              onChangeText={(text) => setFormData((p) => ({ ...p, title: text }))}
              placeholder="Deal title (e.g., '50% off Premium Headphones')"
              placeholderTextColor="#94a3b8"
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Sparkles size={16} color="#6366f1" />
            </View>
            <TextInput
              style={[styles.inputWithPadding, { minHeight: 100, textAlignVertical: 'top' }]}
              value={formData.description}
              onChangeText={(text) => setFormData((p) => ({ ...p, description: text }))}
              placeholder="Describe what makes this deal special..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <View style={styles.inputIcon}>
                <DollarSign size={16} color="#10b981" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                value={formData.price}
                onChangeText={(text) => setFormData((p) => ({ ...p, price: text }))}
                placeholder="Deal Price"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <View style={styles.inputIcon}>
                <DollarSign size={16} color="#64748b" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                value={formData.originalPrice}
                onChangeText={(text) => setFormData((p) => ({ ...p, originalPrice: text }))}
                placeholder="Original Price"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
          </View>

          {formData.originalPrice && formData.price && (
            <Text style={styles.helpTextSuccess}>
              💰 {Math.round((1 - Number(formData.price) / Number(formData.originalPrice)) * 100)}% savings!
            </Text>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Category</Text>
          </View>
          
          {dataLoading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {categories.map((category) => (
                <View key={category.id} style={styles.categoryWrapper}>
                  <TouchableOpacity
                    style={[
                      formData.selectedCategoryId === category.id 
                        ? styles.categoryButton 
                        : styles.categoryButtonInactive
                    ]}
                    onPress={() => setFormData((p) => ({ ...p, selectedCategoryId: category.id }))}
                  >
                    <LinearGradient
                      colors={
                        formData.selectedCategoryId === category.id
                          ? ['#6366f1', '#8b5cf6']
                          : ['transparent', 'transparent']
                      }
                      style={[
                        formData.selectedCategoryId === category.id 
                          ? styles.categoryButton 
                          : styles.categoryButtonInactive
                      ]}
                    >
                      <Text style={
                        formData.selectedCategoryId === category.id 
                          ? styles.categoryEmojiInactive 
                          : styles.categoryEmojiInactive
                      }>
                        {category.emoji}
                      </Text>
                      <Text style={
                        formData.selectedCategoryId === category.id 
                          ? styles.categoryButtonTextActive 
                          : styles.categoryButtonText
                      }>
                        {category.name}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Stores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Store</Text>
          </View>
          
          {dataLoading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {stores.map((store) => (
                <View key={store.id} style={styles.categoryWrapper}>
                  <TouchableOpacity
                    style={[
                      formData.selectedStoreId === store.id 
                        ? styles.categoryButton 
                        : styles.categoryButtonInactive
                    ]}
                    onPress={() => setFormData((p) => ({ ...p, selectedStoreId: store.id }))}
                  >
                    <LinearGradient
                      colors={
                        formData.selectedStoreId === store.id
                          ? ['#10b981', '#059669']
                          : ['transparent', 'transparent']
                      }
                      style={[
                        formData.selectedStoreId === store.id 
                          ? styles.categoryButton 
                          : styles.categoryButtonInactive
                      ]}
                    >
                      <Text style={
                        formData.selectedStoreId === store.id 
                          ? styles.categoryButtonTextActive 
                          : styles.categoryButtonText
                      }>
                        {store.name}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Images */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Upload size={20} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Images</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
            {selectedImages.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <X size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Upload size={28} color="#6366f1" />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
          <Text style={styles.helpText}>
            Add high-quality images to showcase your deal • {selectedImages.length}/5 images
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitButtonWrapper}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient colors={['#10b981', '#059669', '#047857']} style={styles.submitButton}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Save size={20} color="#FFFFFF" />
            )}
            <Text style={styles.submitButtonText}>
              {loading ? 'Updating...' : 'Update Deal'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b', fontWeight: '500' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: { padding: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  deleteButton: { padding: 10, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },

  content: { flex: 1 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginLeft: 8 },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  inputIcon: { backgroundColor: '#eef2ff', padding: 12, marginRight: 12 },
  inputWithPadding: { flex: 1, fontSize: 16, color: '#1e293b', paddingVertical: 16, paddingRight: 16, fontWeight: '500' },
  row: { flexDirection: 'row' },
  
  categoryContainer: { flexDirection: 'row', paddingVertical: 8 },
  categoryWrapper: { marginRight: 12 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  categoryButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  categoryEmojiInactive: { fontSize: 16, marginRight: 8, opacity: 0.7 },
  categoryButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  categoryButtonTextActive: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  
  imageContainer: { marginTop: 16, paddingVertical: 8 },
  imageWrapper: { position: 'relative', marginRight: 16 },
  image: {
    width: 120,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  addImageButton: {
    width: 120,
    height: 80,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addImageText: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 6,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  submitButtonWrapper: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 8 },
  
  helpTextSuccess: { fontSize: 12, color: '#10b981', marginTop: 2, fontWeight: '600' },
  helpText: { fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  bottomPadding: { height: 100 },
});
