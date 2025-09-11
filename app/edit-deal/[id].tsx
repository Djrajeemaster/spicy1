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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService, DealWithRelations, canEditDeal } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { storageService } from '@/services/storageService';
import { apiClient } from '@/utils/apiClient';
import { Database } from '@/types/database';
import * as ImagePicker from 'expo-image-picker';

type Category = Database['public']['Tables']['categories']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

export default function EditDealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();

  // Local state for moderation status (admin only)
  const [status, setStatus] = useState<string | null>(null);

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
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);

  // Debounce the deal URL for validation
  const isWeb = Platform.OS === 'web';

  const notify = (title: string, message: string, type: 'error' | 'success' | 'info' = 'error') => {
    Alert.alert(title, message);
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
          { text: 'Go Back', onPress: handleBackPress }
        ]);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [id, user]);

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
          { text: 'OK', onPress: handleBackPress }
        ]);
        return;
      }

      // Check if user can edit this deal (owner, admin, or super admin)
      if (!canEditDeal(dealData, user.id, profile?.role)) {
        Alert.alert('Access Denied', 'You can only edit your own deals', [
          { text: 'OK', onPress: handleBackPress }
        ]);
        return;
      }

      setDeal(dealData);
  // initialize moderation status
  setStatus(dealData.status || 'pending');

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
        { text: 'Go Back', onPress: handleBackPress }
      ]);
    } finally {
      setInitialLoading(false);
      setDataLoading(false);
      setIsInitialLoad(false); // Allow scraping after initial load
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

  const updateData: any = {
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

      // If user is admin/superadmin include status change if provided
      if ((profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'super_admin') && status) {
        updateData.status = status;
      }

      // Use admin update if user is admin/super_admin and not the creator
  const isAdminEdit = (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'super_admin') && deal.created_by !== user.id;
      
      const [error] = isAdminEdit 
        ? await dealService.adminUpdateDeal(deal.id, updateData, user.id, profile?.role)
        : await dealService.updateDeal(deal.id, updateData, user.id, profile?.role);
      
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
          // Check for duplicates
          if (!selectedImages.includes(uploadResult.data.url)) {
            setSelectedImages(prev => [...prev, uploadResult.data!.url]);
          } else {
            notify('Image Already Added', 'This image is already in your selection.', 'info');
          }
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

  const handleBackPress = () => {
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        // fallback to deal details or home
        if (deal && deal.id) router.replace(`/deal-details?id=${deal.id}`);
        else router.replace('/(tabs)/');
      }
    } catch (_) {
      router.replace('/(tabs)/');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const addScrapedImage = (imageUrl: string) => {
    if (selectedImages.length >= 5) {
      notify('Image Limit Reached', 'You can only add up to 5 images per deal.', 'error');
      return;
    }
    
    if (!selectedImages.includes(imageUrl)) {
      setSelectedImages(prev => [...prev, imageUrl]);
      // Remove from scraped images
      setScrapedImages(prev => prev.filter(img => img !== imageUrl));
      notify('Image Added', 'Image added to your deal!', 'success');
    }
  };

  const addAllScrapedImages = () => {
    const remainingSlots = 5 - selectedImages.length;
    if (remainingSlots <= 0) {
      notify('Image Limit Reached', 'You can only add up to 5 images per deal.', 'error');
      return;
    }
    
    // Filter out images that are already selected to prevent duplicates
    const imagesToAdd = scrapedImages
      .filter(img => !selectedImages.includes(img))
      .slice(0, remainingSlots);
    
    if (imagesToAdd.length === 0) {
      notify('No New Images', 'All scraped images are already selected.', 'info');
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imagesToAdd]);
    setScrapedImages(prev => prev.filter(img => !imagesToAdd.includes(img)));
    
    notify(`${imagesToAdd.length} image${imagesToAdd.length > 1 ? 's' : ''} added`, 'All available images added to your deal!', 'success');
  };

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, dealUrl: url }));

    // Clear scraped images when URL changes
    if (!url || !url.match(/^https?:\/\/.+/)) {
      setScrapedImages([]);
    }

    // Only scrape if this is not the initial load and URL is valid
    if (!isInitialLoad && url && url.match(/^https?:\/\/.+/)) {
      setScrapingLoading(true);
      try {
        const scrapedData = await apiClient.post('/api/scrape-product', { url }) as {
          title: string;
          price: string;
          description: string;
          images: string[];
          domain: string;
        };
        if (scrapedData.title && !formData.title) {
          setFormData(prev => ({ ...prev, title: scrapedData.title }));
        }
        if (scrapedData.price && !formData.price) {
          // Clean price by removing currency symbols and formatting
          const cleanPrice = scrapedData.price.replace(/[$,₹,€,£,¥]/g, '').trim();
          setFormData(prev => ({ ...prev, price: cleanPrice }));
        }
        if (scrapedData.description && !formData.description) {
          setFormData(prev => ({ ...prev, description: scrapedData.description }));
        }
        if (scrapedData.images && scrapedData.images.length > 0) {
          // Store scraped images for manual selection
          setScrapedImages(scrapedData.images);
          
          // Show notification about found images
          notify(`${scrapedData.images.length} image${scrapedData.images.length > 1 ? 's' : ''} found`, 'Images are available below for manual selection.', 'success');
        }
      } catch (error) {
        console.error('Scraping failed:', error);
      } finally {
        setScrapingLoading(false);
      }
    }
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
            onPress={handleBackPress}
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
  <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
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
          {/* Poster Info & Status (Admin only) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Poster</Text>
            </View>

            {deal?.created_by_user ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={{ uri: deal.created_by_user.avatar_url || '' }}
                  style={styles.posterAvatar}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontWeight: '600', color: '#1e293b' }}>{String(deal.created_by_user.username || '')}</Text>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>{`${Number(deal.created_by_user.reputation || 0)} reputation`}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.helpText}>Original poster information not available.</Text>
            )}

            {/* Status selector - visible only to admin/superadmin */}
            {(profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'super_admin') && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ marginBottom: 6, color: '#475569', fontWeight: '600' }}>Moderation Status</Text>
                <View style={styles.statusRow}>
                  <TouchableOpacity style={styles.statusButton} onPress={() => setStatus('pending')}>
                    <Text style={[styles.statusText, status === 'pending' ? styles.statusTextActive : null]}>Pending</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statusButton} onPress={() => setStatus('live')}>
                    <Text style={[styles.statusText, status === 'live' ? styles.statusTextActive : null]}>Approved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statusButton} onPress={() => setStatus('rejected')}>
                    <Text style={[styles.statusText, status === 'rejected' ? styles.statusTextActive : null]}>Rejected</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Zap size={16} color="#f59e0b" />
            </View>
            <TextInput
              style={styles.inputWithPadding}
              value={formData.dealUrl}
              onChangeText={handleUrlChange}
              placeholder="Paste the deal URL here..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Auto Fetch Button */}
          {formData.dealUrl && (
            <TouchableOpacity 
              style={styles.fetchButton}
              onPress={() => handleUrlChange(formData.dealUrl)}
              disabled={scrapingLoading}
            >
              {scrapingLoading ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Zap size={16} color="#6366f1" />
              )}
              <Text style={styles.fetchButtonText}>
                {scrapingLoading ? 'Fetching...' : 'Auto Fill from URL'}
              </Text>
            </TouchableOpacity>
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
                          ? styles.categoryButtonTextActive 
                          : styles.categoryButtonText
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
                    <Text style={styles.addImageText}>Add Image</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={styles.helpText}>
            Add high-quality images to showcase your deal • {selectedImages.length}/5 images
          </Text>

          {/* Scraped Images Section */}
          {scrapedImages.length > 0 && (
            <View style={styles.scrapedImagesContainer}>
              <View style={styles.scrapedImagesHeader}>
                <Text style={styles.scrapedImagesTitle}>📸 Found Images ({scrapedImages.length})</Text>
                <TouchableOpacity 
                  style={styles.addAllImagesButton}
                  onPress={addAllScrapedImages}
                >
                  <Text style={styles.addAllImagesText}>
                    Add All ({Math.min(scrapedImages.length, 5 - selectedImages.length)})
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.scrapedImagesSubtitle}>Click images to add them to your deal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrapedImagesScroll}>
                <View style={styles.scrapedImagesList}>
                  {scrapedImages.map((uri, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.scrapedImageItem}
                      onPress={() => addScrapedImage(uri)}
                    >
                      <Image source={{ uri }} style={styles.scrapedImage} />
                      <View style={styles.scrapedImageOverlay}>
                        <Text style={styles.scrapedImageText}>+</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
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
  fetchingText: { marginLeft: 8, color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  
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
  posterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  statusText: { color: '#475569', fontWeight: '600' },
  statusTextActive: { color: '#10b981' },

  // Scraped Images Styles
  scrapingLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  scrapedImagesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  scrapedImagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scrapedImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
  },
  scrapedImagesSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  scrapedImagesScroll: {
    marginTop: 8,
  },
  scrapedImagesList: {
    flexDirection: 'row',
  },
  scrapedImageItem: {
    position: 'relative',
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scrapedImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  scrapedImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrapedImageText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  addAllImagesButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    height: 80,
  },
  addAllImagesText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: '700', 
    textAlign: 'center' 
  },
  imagesScroll: {
    marginBottom: 8,
  },
  imagesRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  scrapedImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  scrapedImageSelected: {
    borderColor: '#6366f1',
    borderWidth: 3,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrapedImagesNote: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  fetchButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  bottomPadding: { height: 80 },
});
