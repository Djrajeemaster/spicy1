import React, { useEffect, useState } from 'react';
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
  Plus,
  CheckSquare,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { dealService, DealWithRelations } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { storageService } from '@/services/storageService';
import { urlService } from '@/services/urlService';
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
  const [urlValidating, setUrlValidating] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [urlMetadata, setUrlMetadata] = useState<any>(null);
  const [showAutoFill, setShowAutoFill] = useState(false);

  // Debounce the deal URL for validation
  const debouncedDealUrl = useDebounce(formData.dealUrl, 1500);

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
    
    // Set a timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      if (initialLoading) {
        setInitialLoading(false);
        setDataLoading(false);
        Alert.alert('Error', 'Loading timeout. Please try again.', [
          { text: 'Retry', onPress: () => loadData() },
          { text: 'Go Back', onPress: () => router.back() }
        ]);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [id, user]);

  useEffect(() => {
    if (debouncedDealUrl) {
      validateDealUrl(debouncedDealUrl);
    } else {
      setUrlValid(null);
      setUrlMetadata(null);
      setExtractedImages([]);
      setShowAutoFill(false);
    }
  }, [debouncedDealUrl]);

  const loadData = async () => {
    if (!id || !user) {
      setInitialLoading(false);
      setDataLoading(false);
      return;
    }

    try {
      setDataLoading(true);

      // Load deal data
      const [dealError, dealData] = await dealService.getDealById(id);
      
      if (dealError || !dealData) {
        Alert.alert('Error', 'Deal not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      // Check if user owns this deal
      if (dealData.created_by !== user.id) {
        Alert.alert('Access Denied', 'You can only edit your own deals', [
          { text: 'OK', onPress: () => router.back() }
        ]);
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
      Alert.alert('Error', 'Failed to load deal data', [
        { text: 'Retry', onPress: () => loadData() },
        { text: 'Go Back', onPress: () => router.back() }
      ]);
    } finally {
      setInitialLoading(false);
      setDataLoading(false);
    }
  };

  const validateDealUrl = async (url: string) => {
    if (!url.trim()) return;

    setUrlValidating(true);
    setUrlValid(null);

    try {
      const result = await urlService.validateUrl(url);
      
      if (!result.isValid) {
        setUrlValid(false);
        setUrlMetadata(null);
        setExtractedImages([]);
        setShowAutoFill(false);
        return;
      }

      setUrlValid(true);
      
      if (result) {
        setUrlMetadata(result);
        setExtractedImages(result.images || []);
        setShowAutoFill(true);
      }
    } catch (error) {
      console.error('URL validation error:', error);
      setUrlValid(false);
    } finally {
      setUrlValidating(false);
    }
  };

  const handleAutoFill = () => {
    if (!urlMetadata) return;

    const updatedFormData = { ...formData };
    let hasChanges = false;

    // Only auto-fill empty fields to avoid overwriting user edits
    if (urlMetadata.title && !formData.title.trim()) {
      updatedFormData.title = urlMetadata.title;
      hasChanges = true;
    }

    // Description
    if (urlMetadata.description && !formData.description.trim()) {
      updatedFormData.description = urlMetadata.description;
      hasChanges = true;
    }

    // Category matching
    if (urlMetadata.category && categories.length > 0) {
      const matchingCategory = categories.find((cat: Category) =>
        cat.name.toLowerCase().includes(urlMetadata.category!.toLowerCase()) ||
        urlMetadata.category!.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (matchingCategory && !formData.selectedCategoryId) {
        updatedFormData.selectedCategoryId = matchingCategory.id;
        hasChanges = true;
      }
    }

    // Store matching
    if (urlMetadata.store && stores.length > 0) {
      const matchingStore = stores.find((store: Store) =>
        store.name.toLowerCase().includes(urlMetadata.store!.toLowerCase()) ||
        urlMetadata.store!.toLowerCase().includes(store.name.toLowerCase())
      );
      if (matchingStore && !formData.selectedStoreId) {
        updatedFormData.selectedStoreId = matchingStore.id;
        hasChanges = true;
      }
    }

    // Pricing
    if (urlMetadata.price && !formData.price.trim()) {
      updatedFormData.price = urlMetadata.price.toString();
      hasChanges = true;
    }

    if (urlMetadata.originalPrice && !formData.originalPrice.trim()) {
      updatedFormData.originalPrice = urlMetadata.originalPrice.toString();
      hasChanges = true;
    }

    if (hasChanges) {
      setFormData(updatedFormData);
    }

    // Add extracted images if we have space
    if (extractedImages.length > 0 && selectedImages.length < 5) {
      const imagesToAdd = extractedImages.slice(0, 5 - selectedImages.length);
      setSelectedImages(prev => [...prev, ...imagesToAdd]);
    }

    setShowAutoFill(false);
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
        city: formData.city.trim() || '',
        state: formData.state.trim() || '',
        country: formData.country.trim() || null,
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
        setUploadingImages(true);
        const uploadResult = await storageService.uploadImage(result.assets[0].uri);
        if (uploadResult.data && uploadResult.data.url) {
          setSelectedImages(prev => [...prev, uploadResult.data!.url]);
        } else {
          Alert.alert('Error', 'Failed to upload image');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
      } finally {
        setUploadingImages(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const addExtractedImage = (imageUrl: string) => {
    if (selectedImages.length >= 5 || selectedImages.includes(imageUrl)) {
      return;
    }
    setSelectedImages(prev => [...prev, imageUrl]);
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

  if (!id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Invalid deal ID</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Text>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please sign in to edit deals</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.push('/sign-in')}
          >
            <Text>Sign In</Text>
          </TouchableOpacity>
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

        {/* Deal URL */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Deal Link</Text>
            {urlValidating && <ActivityIndicator size="small" color="#f59e0b" style={{ marginLeft: 8 }} />}
            {urlValid === true && <CheckCircle size={20} color="#10b981" style={{ marginLeft: 8 }} />}
            {urlValid === false && <X size={20} color="#ef4444" style={{ marginLeft: 8 }} />}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Zap size={16} color="#f59e0b" />
            </View>
            <TextInput
              style={styles.inputWithPadding}
              value={formData.dealUrl}
              onChangeText={(text) => setFormData((p) => ({ ...p, dealUrl: text }))}
              placeholder="Paste the deal URL here..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {showAutoFill && urlMetadata && (
            <TouchableOpacity style={styles.autoFillButton} onPress={handleAutoFill}>
              <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.autoFillButton}>
                <Zap size={20} color="#FFFFFF" />
                <Text style={styles.autoFillButtonText}>Auto-fill from URL</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {urlValid === false && (
            <Text style={styles.helpTextError}>
              ⚠️ Please enter a valid URL (e.g., https://amazon.com/...)
            </Text>
          )}
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

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#ef4444" />
            <Text style={styles.sectionTitle}>Location (Optional)</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 2, marginRight: 8 }]}>
              <View style={styles.inputIcon}>
                <MapPin size={16} color="#ef4444" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                value={formData.city}
                onChangeText={(text) => setFormData((p) => ({ ...p, city: text }))}
                placeholder="City"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <View style={styles.inputIcon}>
                <MapPin size={16} color="#ef4444" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                value={formData.state}
                onChangeText={(text) => setFormData((p) => ({ ...p, state: text }))}
                placeholder="State"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <MapPin size={16} color="#ef4444" />
            </View>
            <TextInput
              style={styles.inputWithPadding}
              value={formData.country}
              onChangeText={(text) => setFormData((p) => ({ ...p, country: text }))}
              placeholder="Country"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Additional Details</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Calendar size={16} color="#f59e0b" />
            </View>
            <TextInput
              style={styles.inputWithPadding}
              value={formData.expiryDate}
              onChangeText={(text) => setFormData((p) => ({ ...p, expiryDate: text }))}
              placeholder="Expiry Date (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Sparkles size={16} color="#8b5cf6" />
            </View>
            <TextInput
              style={styles.inputWithPadding}
              value={formData.couponCode}
              onChangeText={(text) => setFormData((p) => ({ ...p, couponCode: text }))}
              placeholder="Coupon Code (if any)"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Upload size={20} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Images</Text>
          </View>
          
          {/* Extracted Images from Deal URL */}
          {extractedImages.length > 0 && (
            <View style={styles.extractedImagesSection}>
              <Text style={styles.extractedImagesTitle}>Images from Deal URL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extractedImageContainer}>
                {extractedImages.map((imageUrl, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.extractedImageWrapper}
                    onPress={() => addExtractedImage(imageUrl)}
                    disabled={selectedImages.length >= 5 || selectedImages.includes(imageUrl)}
                  >
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.extractedImage}
                      onError={(error) => {
                        console.log(`Failed to load image: ${imageUrl}`, error);
                      }}
                    />
                    <View style={[
                      styles.extractedImageOverlay,
                      selectedImages.includes(imageUrl) && styles.extractedImageOverlaySelected
                    ]}>
                      {selectedImages.includes(imageUrl) ? (
                        <CheckSquare size={24} color="#22c55e" />
                      ) : (
                        <Plus size={24} color="#ffffff" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.extractedHelpText}>
                Tap to add images from the deal website
              </Text>
            </View>
          )}
          
          {/* Selected Images */}
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
            {selectedImages.length < 5 && (
              <TouchableOpacity 
                style={styles.addImageButton} 
                onPress={pickImage}
                disabled={uploadingImages}
              >
                {uploadingImages ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <>
                    <Upload size={28} color="#6366f1" />
                    <Text style={styles.addImageText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={styles.helpText}>
            Add high-quality images to showcase your deal - {selectedImages.length}/5 images
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
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', flex: 1, textAlign: 'center', marginHorizontal: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  deleteButton: { padding: 8, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },

  content: { flex: 1 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginLeft: 6 },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: { backgroundColor: '#f1f5f9', padding: 8, marginRight: 8, borderRadius: 6 },
  inputWithPadding: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 12, paddingRight: 12, fontWeight: '400' },
  row: { flexDirection: 'row' },
  
  autoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  autoFillButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  categoryContainer: { flexDirection: 'row', paddingVertical: 4 },
  categoryWrapper: { marginRight: 8 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  categoryButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryEmojiInactive: { fontSize: 14, marginRight: 6, opacity: 0.8 },
  categoryButtonText: { fontSize: 12, fontWeight: '500', color: '#64748b' },
  categoryButtonTextActive: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  
  imageContainer: { marginTop: 12, paddingVertical: 4 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  image: {
    width: 100,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  addImageButton: {
    width: 100,
    height: 70,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  addImageText: {
    fontSize: 10,
    color: '#6366f1',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  submitButtonWrapper: { marginHorizontal: 16, marginTop: 12, marginBottom: 16, borderRadius: 8, overflow: 'hidden' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 6 },
  
  helpTextSuccess: { fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: '500' },
  helpTextError: { fontSize: 11, color: '#ef4444', marginTop: 2, fontWeight: '500' },
  helpText: { fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  
  // Extracted Images Styles
  extractedImagesSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  extractedImagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  extractedImageContainer: {
    marginBottom: 8,
  },
  extractedImageWrapper: {
    marginRight: 8,
    position: 'relative',
  },
  extractedImage: {
    width: 80,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  extractedImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extractedImageOverlaySelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  extractedHelpText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  
  bottomPadding: { height: 80 },
});
