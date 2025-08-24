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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { storageService } from '@/services/storageService';
import { Database } from '@/types/database';
import * as ImagePicker from 'expo-image-picker';

type Category = Database['public']['Tables']['categories']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

export default function PostDealScreen() {
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    selectedCategoryId: '',
    selectedStoreId: '',
    city: '',
    state: '',
    country: 'India',
    expiryDate: '',
    rulesAccepted: false,
  });

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  /** ---------- in-app notice + confirm (web), native Alert elsewhere ---------- */
  const isWeb = Platform.OS === 'web';

  type NoticeType = 'error' | 'success' | 'info';
  const [notice, setNotice] = useState<{
    type: NoticeType;
    title: string;
    message: string;
  } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    okText: string;
    cancelText: string;
  }>({ open: false, title: '', message: '', okText: 'OK', cancelText: 'Cancel' });
  const confirmResolveRef = useRef<(val: boolean) => void>();

  const notify = (title: string, message: string, type: NoticeType = 'error') => {
    if (isWeb) setNotice({ type, title, message });
    else Alert.alert(title, message);
  };

  const confirm = (title: string, message: string, okText = 'OK', cancelText = 'Cancel') => {
    if (isWeb) {
      return new Promise<boolean>((resolve) => {
        confirmResolveRef.current = resolve;
        setConfirmState({ open: true, title, message, okText, cancelText });
      });
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: okText, onPress: () => resolve(true) },
      ]);
    });
  };
  /** ------------------------------------------------------------------------ */

  useEffect(() => {
    const loadFormData = async () => {
      setDataLoading(true);
      try {
        const { data: fetchedCategories, error: categoryError } = await categoryService.getCategories();
        if (categoryError) {
          console.error('Error fetching categories:', categoryError);
          notify('Error', 'Failed to load categories.');
        } else {
          setCategories(fetchedCategories || []);
        }

        const { data: fetchedStores, error: storeError } = await storeService.getStores();
        if (storeError) {
          console.error('Error fetching stores:', storeError);
          notify('Error', 'Failed to load stores.');
        } else {
          setStores(fetchedStores || []);
        }
      } catch (err) {
        console.error('Unexpected error loading form data:', err);
        notify('Error', 'Failed to load form data.');
      } finally {
        setDataLoading(false);
      }
    };
    loadFormData();
  }, []);

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      notify('Permission Required', 'We need access to your photo library to add images to your deal.', 'info');
      return;
    }
    if (isWeb) {
      openGallery();
    } else {
      Alert.alert('Add Photos', 'Choose how to add photos', [
        { text: '📷 Camera', onPress: () => openCamera() },
        { text: '🖼️ Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      notify('Permission Required', 'We need access to your camera to take photos for your deal.', 'info');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets) {
      const newImageUris = result.assets.map((a) => a.uri);
      setSelectedImages((prev) => {
        const combined = [...prev, ...newImageUris];
        return combined.slice(0, 5);
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const createDealRecord = async (uploadedImageUrls: string[]) => {
    try {
      const price = parseFloat(formData.price);
      const originalPrice = formData.originalPrice ? parseFloat(formData.originalPrice) : null;

      const dealData: Database['public']['Tables']['deals']['Insert'] = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price,
        original_price: originalPrice ?? null,
        category_id: formData.selectedCategoryId,
        store_id: formData.selectedStoreId,
        city: formData.city.trim(),
        state: formData.state?.trim() || null,
        country: formData.country?.trim() || 'India',
        is_online: true,
        created_by: user!.id,
        images: uploadedImageUrls,
      };

      if (
        profile?.role === 'verified' ||
        profile?.role === 'business' ||
        profile?.role === 'admin' ||
        profile?.role === 'superadmin'
      ) {
        dealData.status = 'live';
      } else {
        dealData.status = 'pending';
      }

      const { error } = await dealService.createDeal(dealData);
      if (error) {
        console.error('Error creating deal:', error);
        notify('Deal Submission Failed', error.message);
        return;
      }

      const msg =
        dealData.status === 'live'
          ? 'Your deal is now live! Thanks for sharing with the community.'
          : "Your deal has been submitted for review. You'll be notified once it's approved!";

      if (isWeb) {
        notify('🎉 Deal Posted!', msg, 'success');
        router.push('/profile');
      } else {
        Alert.alert('🎉 Deal Posted!', msg, [
          { text: 'View My Deals', onPress: () => router.push('/profile') },
          {
            text: 'Post Another',
            onPress: () => {
              setFormData({
                title: '',
                description: '',
                price: '',
                originalPrice: '',
                selectedCategoryId: '',
                selectedStoreId: '',
                city: '',
                state: '',
                country: 'India',
                expiryDate: '',
                rulesAccepted: false,
              });
              setSelectedImages([]);
            },
          },
        ]);
      }
    } finally {
      setUploadingImages(false);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      const goSignIn = await confirm(
        'Join SpicyBeats',
        'Sign in to share amazing deals with the community?',
        'Sign In',
        'Maybe Later'
      );
      if (goSignIn) router.push('/sign-in');
      return;
    }

    // validations (no blocking browser popups on web)
    if (!formData.title.trim()) return notify('Missing Information', 'Please enter a deal title.');
    if (!formData.description.trim()) return notify('Missing Information', 'Please enter a deal description.');
    if (!formData.selectedCategoryId) return notify('Missing Information', 'Please select a category.');
    if (!formData.selectedStoreId) return notify('Missing Information', 'Please select a store.');
    if (!formData.city.trim()) return notify('Missing Information', 'Please enter a city for the deal.');
    if (!formData.rulesAccepted) return notify('Community Rules', 'Please accept our community guidelines to continue.');

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) return notify('Invalid Price', 'Please enter a valid price for the deal.');
    const originalPriceParsed = formData.originalPrice ? parseFloat(formData.originalPrice) : null;
    if (originalPriceParsed !== null && (isNaN(originalPriceParsed) || originalPriceParsed <= 0)) {
      return notify('Invalid Original Price', 'Please enter a valid original price.');
    }

    setLoading(true);

    try {
      let uploadedImageUrls: string[] = [];

      if (selectedImages.length > 0) {
        setUploadingImages(true);
        const { data: uploadResults, error: uploadError } = await storageService.uploadMultipleImages(selectedImages);

        if (uploadError) {
          console.error('Error uploading images:', uploadError);
          const proceed = await confirm(
            'Image Upload Failed',
            'Some images could not be uploaded. Continue without images?',
            'Continue',
            'Cancel'
          );
          if (!proceed) {
            setUploadingImages(false);
            setLoading(false);
            return;
          }
          uploadedImageUrls = [];
        } else {
          uploadedImageUrls = (uploadResults || []).map((r: any) => r.url).filter(Boolean);
        }
        setUploadingImages(false);
      }

      await createDealRecord(uploadedImageUrls);
    } catch (err) {
      console.error('Unexpected error during deal submission:', err);
      notify('Connection Error', 'Unable to connect to the server. Please try again.');
      setUploadingImages(false);
      setLoading(false);
    }
  };

  // -------------------- RENDER --------------------
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6366f1', '#8b5cf6', '#d946ef']} style={styles.guestGradient}>
          <View style={styles.guestContainer}>
            <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} style={styles.guestIconContainer}>
              <Sparkles size={48} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.guestTitle}>Share Amazing Deals</Text>
            <Text style={styles.guestDescription}>Help your community save money by sharing the best deals you find!</Text>

            <View style={styles.featuresContainer}>
              {[
                { emoji: '⚡', title: 'Instant Publishing', desc: 'Verified users go live immediately' },
                { emoji: '🏆', title: 'Build Reputation', desc: 'Earn points for quality deals' },
                { emoji: '💎', title: 'Premium Features', desc: 'Access exclusive posting tools' },
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.joinButtonWrapper} onPress={() => router.push('/sign-in')}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.joinButton}>
                <Zap size={20} color="#FFFFFF" />
                <Text style={styles.joinButtonText}>Start Sharing Deals</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (dataLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading form data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.headerTitle}>Share a Deal</Text>
        <Text style={styles.headerSubtitle}>Help your community save money</Text>
      </LinearGradient>

      {/* web notice banner */}
      {isWeb && notice && (
        <View
          style={[
            styles.notice,
            notice.type === 'error' && styles.noticeError,
            notice.type === 'success' && styles.noticeSuccess,
            notice.type === 'info' && styles.noticeInfo,
          ]}
        >
          <Text style={styles.noticeText}>
            {notice.title ? `${notice.title}: ` : ''}
            {notice.message}
          </Text>
          <TouchableOpacity onPress={() => setNotice(null)} style={styles.noticeClose}>
            <X size={16} color="#0f172a" />
          </TouchableOpacity>
        </View>
      )}

      {/* web confirm modal */}
      {isWeb && confirmState.open && (
        <View style={styles.modalBackdrop} pointerEvents="box-none">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmState.title}</Text>
            <Text style={styles.modalBody}>{confirmState.message}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setConfirmState((s) => ({ ...s, open: false }));
                  confirmResolveRef.current?.(false);
                }}
              >
                <Text style={styles.modalBtnText}>{confirmState.cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setConfirmState((s) => ({ ...s, open: false }));
                  confirmResolveRef.current?.(true);
                }}
              >
                <Text style={styles.modalBtnText}>{confirmState.okText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Deal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deal Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50% Off Premium Headphones"
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us what makes this deal special..."
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Sale Price *</Text>
              <View style={styles.inputWithIcon}>
                <View style={styles.inputIcon}>
                  <DollarSign size={18} color="#10b981" />
                </View>
                <TextInput
                  style={styles.inputWithPadding}
                  placeholder="29.99"
                  value={formData.price}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, price: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Original Price (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <View style={styles.inputIcon}>
                  <DollarSign size={18} color="#ef4444" />
                </View>
                <TextInput
                  style={styles.inputWithPadding}
                  placeholder="59.99"
                  value={formData.originalPrice}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, originalPrice: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Category & Store</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryWrapper}
                    onPress={() => setFormData((p) => ({ ...p, selectedCategoryId: category.id }))}
                  >
                    {formData.selectedCategoryId === category.id ? (
                      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.categoryButton}>
                        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                        <Text style={styles.categoryButtonTextActive}>{category.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.categoryButtonInactive}>
                        <Text style={styles.categoryEmojiInactive}>{category.emoji}</Text>
                        <Text style={styles.categoryButtonText}>{category.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Store *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {stores.map((store) => (
                  <TouchableOpacity
                    key={store.id}
                    style={styles.categoryWrapper}
                    onPress={() => setFormData((p) => ({ ...p, selectedStoreId: store.id }))}
                  >
                    {formData.selectedStoreId === store.id ? (
                      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.categoryButton}>
                        <Text style={styles.categoryButtonTextActive}>{store.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.categoryButtonInactive}>
                        <Text style={styles.categoryButtonText}>{store.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color="#6366f1" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                placeholder="e.g., New York"
                value={formData.city}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>State (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., NY"
                value={formData.state}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, state: text }))}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Country (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., USA"
                value={formData.country}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, country: text }))}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Photos & Details</Text>

          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.imagePreviewTitle}>Selected Images ({selectedImages.length}/5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagePreviewList}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.imagePreviewItem}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                        <X size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.imageUploader} onPress={handleImagePicker}>
            <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.imageUploaderGradient}>
              <View style={styles.uploadIconContainer}>
                <Upload size={32} color="#6366f1" />
              </View>
              <Text style={styles.imageUploaderText}>{selectedImages.length > 0 ? 'Add More Photos' : 'Add Photos'}</Text>
              <Text style={styles.imageUploaderSubtext}>
                {selectedImages.length > 0 ? `${selectedImages.length}/5 photos selected` : 'Show off the deal with great photos'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expiry Date (Optional)</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.inputIcon}>
                <Calendar size={18} color="#f59e0b" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                placeholder="MM/DD/YYYY"
                value={formData.expiryDate}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, expiryDate: text }))}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.rulesContainer}
            onPress={() => setFormData((prev) => ({ ...prev, rulesAccepted: !prev.rulesAccepted }))}
          >
            <View style={[styles.checkbox, formData.rulesAccepted && styles.checkboxActive]}>
              {formData.rulesAccepted && <CheckCircle size={20} color="#FFFFFF" />}
            </View>
            <View style={styles.rulesTextContainer}>
              <Text style={styles.rulesText}>
                I agree to the{' '}
                <Text
                  style={styles.rulesLink}
                  onPress={() =>
                    notify(
                      'Community Guidelines',
                      '• No offensive or illegal content\n• Deals must be legitimate and available\n• Include accurate pricing and location\n• No spam or duplicate posts\n• Be respectful to other users',
                      'info'
                    )
                  }
                >
                  community guidelines
                </Text>{' '}
                and confirm this deal is legitimate
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitButtonWrapper} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.submitButton}>
            {loading || uploadingImages ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{uploadingImages ? 'Uploading Images...' : 'Creating Deal...'}</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Share This Deal</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.verificationInfo}>
          <Shield size={16} color="#10b981" />
          <Text style={styles.verificationText}>
            ✨ Verified users see their posts go live instantly. New users need quick approval first.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },

  // web notice banner
  notice: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeText: { flex: 1, color: '#0f172a', fontWeight: '600' },
  noticeClose: { marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: '#e2e8f0' },
  noticeError: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  noticeSuccess: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  noticeInfo: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },

  // web confirm modal
  modalBackdrop: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: { width: '88%', backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    marginLeft: 10,
  },
  modalBtnCancel: { backgroundColor: '#e5e7eb' },
  modalBtnText: { color: '#111827', fontWeight: '700' },

  guestGradient: { flex: 1 },
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  guestIconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  guestTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  guestDescription: { fontSize: 17, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 26, marginBottom: 32 },
  featuresContainer: { marginBottom: 40 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  featureEmoji: { fontSize: 32, marginRight: 20 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  featureDesc: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  joinButtonWrapper: { borderRadius: 16, overflow: 'hidden' },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 18 },
  joinButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 8 },

  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 40, paddingBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  form: { flex: 1, marginTop: -20 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 20, letterSpacing: -0.3 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    fontWeight: '500',
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
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
  categoryEmoji: { fontSize: 16, marginRight: 8 },
  categoryEmojiInactive: { fontSize: 16, marginRight: 8, opacity: 0.7 },
  categoryButtonText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  categoryButtonTextActive: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  imageUploader: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  imageUploaderGradient: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 40,
    alignItems: 'center',
  },
  uploadIconContainer: { backgroundColor: '#eef2ff', borderRadius: 20, padding: 16, marginBottom: 16 },
  imageUploaderText: { fontSize: 18, fontWeight: '700', color: '#6366f1', marginBottom: 8 },
  imageUploaderSubtext: { fontSize: 15, color: '#94a3b8', textAlign: 'center' },
  imagePreviewContainer: { marginBottom: 20 },
  imagePreviewTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  imagePreviewList: { flexDirection: 'row', paddingVertical: 8 },
  imagePreviewItem: { position: 'relative', marginRight: 12 },
  imagePreview: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f1f5f9' },
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
    elevation: 4,
  },
  rulesContainer: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  rulesText: { fontSize: 15, color: '#374151', lineHeight: 22, fontWeight: '500' },
  rulesTextContainer: { flex: 1 },
  rulesLink: { color: '#6366f1', fontWeight: '700', textDecorationLine: 'underline' },
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
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  verificationText: { flex: 1, fontSize: 14, color: '#065f46', marginLeft: 12, lineHeight: 20, fontWeight: '500' },
  bottomPadding: { height: 100 },
});
