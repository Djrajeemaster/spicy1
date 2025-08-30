import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  Home,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { dealService } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { storageService } from '@/services/storageService';
import { extractUrlData, shouldUseStoreModal, isValidUrlFormat, validateUrl } from '@/services/urlService';
import { Database } from '@/types/database';
import StoreModal from '@/components/StoreModal';
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
    country: '',
    expiryDate: '',
    dealUrl: '',
    couponCode: '',
    rulesAccepted: false,
  });

  const [loading, setLoading] = useState(false);
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

  const [amazonImageUrl, setAmazonImageUrl] = useState('');

  // Store Modal State
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeModalUrl, setStoreModalUrl] = useState('');

  // Debounce the deal URL for validation
  const debouncedDealUrl = useDebounce(formData.dealUrl, 1500);

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
  const confirmResolveRef = useRef<((val: boolean) => void) | undefined>(undefined);

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

  // Function to reset the form to initial state
  const resetForm = useCallback(() => {
    setFormData({
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
      rulesAccepted: false,
    });
    setSelectedImages([]);
    setExtractedImages([]);
    setUrlMetadata(null);
    setUrlValid(null);
    setAmazonImageUrl('');
    setShowAutoFill(false);
    console.log('📝 Post form reset');
  }, []);

  // Track if user has started filling the form
  const hasFormData = formData.title.trim() || 
                     formData.description.trim() || 
                     formData.price.trim() || 
                     formData.dealUrl.trim() || 
                     selectedImages.length > 0;

  // Reset form when navigating to this page (but only if it's dirty)
  useFocusEffect(
    useCallback(() => {
      // Only reset if user has some data and it's been more than 30 seconds since last interaction
      // This prevents accidental resets while actively using the form
      const lastInteractionTime = Date.now();
      
      return () => {
        // On blur (leaving the page), mark the time
        if (hasFormData) {
          console.log('📝 Post: User left page with form data');
        }
      };
    }, [hasFormData])
  );

  // Effect to validate URL when it changes
  useEffect(() => {
    if (debouncedDealUrl && debouncedDealUrl.trim()) {
      validateDealUrl(debouncedDealUrl.trim());
    } else {
      setUrlValid(null);
      setExtractedImages([]);
    }
  }, [debouncedDealUrl]);

  useEffect(() => {
    const loadFormData = async () => {
      setDataLoading(true);
      try {
        // Set a timeout for the entire loading operation
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Loading timeout')), 15000)
        );

        const loadPromise = Promise.all([
          categoryService.getCategories(),
          storeService.getStores()
        ]);

        const [categoriesResult, storesResult] = await Promise.race([
          loadPromise,
          timeoutPromise
        ]) as any;

        const { data: fetchedCategories, error: categoryError } = categoriesResult;
        if (categoryError) {
          console.error('Error fetching categories:', categoryError);
          notify('Error', 'Failed to load categories.');
        } else {
          setCategories(fetchedCategories || []);
        }

        const { data: fetchedStores, error: storeError } = storesResult;
        if (storeError) {
          console.error('Error fetching stores:', storeError);
          notify('Error', 'Failed to load stores.');
        } else {
          setStores(fetchedStores || []);
        }
      } catch (err) {
        console.error('Unexpected error loading form data:', err);
        notify('Error', 'Failed to load form data. Please refresh the page.');
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
        { text: '🔗 Image URL', onPress: () => promptForImageUrl() },
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
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        notify('Image Too Large', 'Please select an image smaller than 2MB.');
        return;
      }
      setSelectedImages((prev) => [...prev, asset.uri]);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.5,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets) {
      const validAssets = result.assets.filter(asset => {
        if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          notify('Image Too Large', `Image ${asset.fileName || 'selected'} is larger than 2MB and was skipped.`);
          return false;
        }
        return true;
      });
      const newImageUris = validAssets.map((a) => a.uri);
      setSelectedImages((prev) => {
        const combined = [...prev, ...newImageUris];
        return combined.slice(0, 5);
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const promptForImageUrl = async () => {
    if (isWeb) {
      // For web, use a prompt
      const url = prompt('Enter image URL (Amazon, eBay, or any direct image URL):');
      if (url && url.trim()) {
        addImageFromUrl(url.trim());
      }
    } else {
      // For mobile, use Alert.prompt (iOS) or create a custom input modal
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Add Image URL',
          'Enter the image URL (Amazon, eBay, or any direct image URL):',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add', 
              onPress: (url) => {
                if (url && url.trim()) {
                  addImageFromUrl(url.trim());
                }
              }
            },
          ],
          'plain-text',
          '',
          'url'
        );
      } else {
        // For Android, we'll need to create a simple input modal or use the Amazon input field approach
        notify('Add Image URL', 'For Android, please use the Amazon image input field when you paste an Amazon deal URL, or copy the image URL and use the web version for now.', 'info');
      }
    }
  };

  const addImageFromUrl = (url: string) => {
    if (selectedImages.length >= 5) {
      notify('Image Limit Reached', 'You can only add up to 5 images per deal.', 'error');
      return;
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      notify('Invalid URL', 'Please enter a valid image URL starting with http:// or https://', 'error');
      return;
    }

    // Check if it's likely an image URL
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const isDirectImageUrl = imageExtensions.some(ext => url.toLowerCase().includes(ext));
    const isAmazonImage = url.includes('m.media-amazon.com/images/I/');
    const isEbayImage = url.includes('i.ebayimg.com');

    if (!isDirectImageUrl && !isAmazonImage && !isEbayImage) {
      notify('Invalid Image URL', 'Please enter a direct image URL (should end with .jpg, .png, etc.) or an Amazon/eBay image URL.', 'error');
      return;
    }

    // Add to selected images
    setSelectedImages(prev => [...prev, url]);
    
    if (isAmazonImage) {
      notify('Amazon Image Added!', 'Amazon image URL added successfully!', 'success');
    } else if (isEbayImage) {
      notify('eBay Image Added!', 'eBay image URL added successfully!', 'success');
    } else {
      notify('Image Added!', 'Image URL added successfully!', 'success');
    }
  };

  const validateDealUrl = async (url: string) => {
    console.log('validateDealUrl called with:', url);
    
    if (!url || !isValidUrlFormat(url)) {
      console.log('URL format invalid or empty');
      setUrlValid(null);
      setExtractedImages([]);
      setUrlMetadata(null);
      setShowAutoFill(false);
      return;
    }

    setUrlValidating(true);
    setUrlValid(null);

    try {
      console.log('Calling urlService.validateUrl for:', url);
      
      // Add timeout for URL validation to prevent hanging
      const validationTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('URL validation timeout')), 15000)
      );

      const validationPromise = validateUrl(url);
      
      const result = await Promise.race([
        validationPromise,
        validationTimeoutPromise
      ]) as any;
      
      console.log('URL validation result:', result);
      
      if (result.isReachable) {
        setUrlValid(true);
        setUrlMetadata(result);
        
        // Show auto-fill option if we found useful metadata
        if (result.title || result.description || result.category || result.store || 
            result.price || result.originalPrice || result.couponCode || 
            (result.images && result.images.length > 0)) {
          setShowAutoFill(true);
        }
        
        // Special handling for Amazon URLs
        if (url.toLowerCase().includes('amazon')) {
          console.log('Amazon URL detected, result.images:', result.images);
          if (result.images && result.images.length > 0) {
            setExtractedImages(result.images);
            console.log(`Setting ${result.images.length} Amazon images:`, result.images);
            notify('Amazon URL Detected', 'To add Amazon product images, right-click on the product images on Amazon and copy the image URL, then paste them in the manual image picker below. Amazon image URLs work with format: m.media-amazon.com/images/I/...', 'info');
          } else {
            setExtractedImages([]);
            console.log('No Amazon images found in result');
            notify('Amazon URL Detected', 'Amazon product found! To add product images: 1) Go to the Amazon page, 2) Right-click on product images, 3) Copy image URL, 4) Use manual image picker below to add them.', 'info');
          }
        } else {
          // Set extracted images if we found them from the URL
          if (result.images && result.images.length > 0) {
            console.log(`Found ${result.images.length} images from URL:`, result.images);
            setExtractedImages(result.images);
            notify('Images Found!', `Found ${result.images.length} image(s) from the URL. You can add them below.`, 'info');
          } else {
            console.log('No images found in URL validation result');
            setExtractedImages([]);
          }
        }
      } else {
        setUrlValid(false);
        setExtractedImages([]);
        setUrlMetadata(null);
        setShowAutoFill(false);
        notify('URL Not Reachable', result.error || 'The URL appears to be invalid or unreachable.', 'error');
      }
    } catch (error: any) {
      console.error('URL validation error:', error);
      setUrlValid(false);
      setExtractedImages([]);
      setUrlMetadata(null);
      setShowAutoFill(false);
      
      if (error.message === 'URL validation timeout') {
        notify('URL Timeout', 'URL validation is taking too long. You can still post the deal with the URL, but we cannot extract images or metadata.', 'error');
      } else {
        notify('URL Error', 'Could not validate the URL. You can still post the deal.', 'error');
      }
    } finally {
      setUrlValidating(false);
    }
  };

  const autoFillFromUrl = async () => {
    if (!urlMetadata) return;

    const updatedFormData = { ...formData };
    let fieldsUpdated = [];

    // Auto-fill title (only if empty or user confirms)
    if (urlMetadata.title && (!formData.title.trim() || 
        await confirm('Auto-fill title?', `Replace current title with: "${urlMetadata.title}"?`))) {
      updatedFormData.title = urlMetadata.title;
      fieldsUpdated.push('title');
    }

    // Auto-fill description (only if empty or user confirms)
    if (urlMetadata.description && (!formData.description.trim() || 
        await confirm('Auto-fill description?', `Replace current description with extracted content?`))) {
      updatedFormData.description = urlMetadata.description;
      fieldsUpdated.push('description');
    }

    // Auto-select category if we can match it
    if (urlMetadata.category && categories.length > 0) {
      const matchingCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(urlMetadata.category.toLowerCase()) ||
        urlMetadata.category.toLowerCase().includes(cat.name.toLowerCase())
      );
      
      if (matchingCategory && (!formData.selectedCategoryId || 
          await confirm('Auto-select category?', `Set category to: "${matchingCategory.name}"?`))) {
        updatedFormData.selectedCategoryId = matchingCategory.id;
        fieldsUpdated.push('category');
      }
    }

    // Auto-select store if we can match it
    if (urlMetadata.store && stores.length > 0) {
      const matchingStore = stores.find(store => 
        store.name.toLowerCase().includes(urlMetadata.store.toLowerCase()) ||
        urlMetadata.store.toLowerCase().includes(store.name.toLowerCase())
      );
      
      if (matchingStore && (!formData.selectedStoreId || 
          await confirm('Auto-select store?', `Set store to: "${matchingStore.name}"?`))) {
        updatedFormData.selectedStoreId = matchingStore.id;
        fieldsUpdated.push('store');
      }
    }

    // Auto-fill pricing information
    if (urlMetadata.price && (!formData.price.trim() || 
        await confirm('Auto-fill price?', `Set price to: $${urlMetadata.price}?`))) {
      updatedFormData.price = urlMetadata.price.toString();
      fieldsUpdated.push('price');
    }

    if (urlMetadata.originalPrice && (!formData.originalPrice.trim() || 
        await confirm('Auto-fill original price?', `Set original price to: $${urlMetadata.originalPrice}?`))) {
      updatedFormData.originalPrice = urlMetadata.originalPrice.toString();
      fieldsUpdated.push('original price');
    }

    // Auto-fill coupon code
    if (urlMetadata.couponCode && (!formData.couponCode.trim() || 
        await confirm('Auto-fill coupon code?', `Set coupon code to: "${urlMetadata.couponCode}"?`))) {
      updatedFormData.couponCode = urlMetadata.couponCode;
      fieldsUpdated.push('coupon code');
    }

    // Update form data
    setFormData(updatedFormData);

    // Add images if available and slots are free
    if (urlMetadata.images && urlMetadata.images.length > 0 && selectedImages.length < 5) {
      const imagesToAdd = urlMetadata.images.slice(0, 5 - selectedImages.length);
      setSelectedImages(prev => [...prev, ...imagesToAdd]);
      fieldsUpdated.push('images');
    }

    // Show success message
    if (fieldsUpdated.length > 0) {
      notify('Auto-Fill Complete!', `Updated: ${fieldsUpdated.join(', ')}. Review and adjust as needed.`, 'success');
      setShowAutoFill(false);
    } else {
      notify('Nothing to Fill', 'All fields are already filled or no matching data found.', 'info');
    }
  };

  const addExtractedImages = (imagesToAdd: string[]) => {
    setSelectedImages(prev => {
      const combined = [...prev, ...imagesToAdd];
      return combined.slice(0, 5); // Limit to 5 images
    });
    
    // Remove the added images from extracted images instead of clearing all
    setExtractedImages(prev => prev.filter(img => !imagesToAdd.includes(img)));
    
    // Special message for Amazon images
    if (urlMetadata?.store === 'Amazon') {
      notify('Amazon Images Added!', `Added ${imagesToAdd.length} Amazon image(s). If they don't upload, try using manual image picker.`);
    } else {
      notify('Images Added!', `Added ${imagesToAdd.length} image(s) from the URL.`);
    }
  };

  const createDealRecord = async (uploadedImageUrls: string[]) => {
    try {
      // Parse the validated price (we already validated it's not empty and is valid)
      const price = parseFloat(formData.price);
      const originalPrice = formData.originalPrice ? parseFloat(formData.originalPrice) : null;

      // Ensure price is valid (extra safety check)
      if (isNaN(price) || price <= 0) {
        throw new Error('Invalid price value');
      }

      const dealData: Database['public']['Tables']['deals']['Insert'] = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price,
        original_price: originalPrice ?? null,
        category_id: formData.selectedCategoryId,
        store_id: formData.selectedStoreId || '',
        city: formData.city.trim() || '',
        state: formData.state?.trim() || '',
        country: formData.country?.trim() || null,
        is_online: true,
        deal_url: formData.dealUrl.trim() || null,
        coupon_code: formData.couponCode.trim() || null,
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

      console.log('Creating deal with data:', dealData);
      
      // Set up timeout for deal creation
      const createDealTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Deal creation timeout')), 30000)
      );

      const createDealPromise = dealService.createDeal(dealData);
      
      const [error, result] = await Promise.race([
        createDealPromise,
        createDealTimeout
      ]) as any;
      
      console.log('Deal creation result:', { error, result });
      
      if (error) {
        console.error('Error creating deal:', error);
        notify('Deal Submission Failed', error.message || 'Failed to create deal. Please try again.');
        setUploadingImages(false);
        setLoading(false);
        return;
      }

      console.log('Deal created successfully, preparing success message...');

      const msg =
        dealData.status === 'live'
          ? 'Your deal is now live! Thanks for sharing with the community.'
          : "Your deal has been submitted for review. You'll be notified once it's approved!";

      console.log('Success message prepared:', msg);
      console.log('isWeb value:', isWeb);

      try {
        console.log('About to show success notification/alert...');
        
        if (isWeb) {
          console.log('Showing web notification...');
          notify('🎉 Deal Posted!', msg, 'success');
          console.log('Web notification shown, navigating to profile...');
          
          // Reset form first, then navigate
          setFormData({
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
            rulesAccepted: false,
          });
          setSelectedImages([]);
          
          setTimeout(() => {
            router.push('/profile');
          }, 1000);
          console.log('Navigation initiated');
        } else {
          console.log('Showing mobile alert...');
          Alert.alert('🎉 Deal Posted!', msg, [
            { text: 'View My Deals', onPress: () => {
              console.log('View My Deals pressed');
              router.push('/profile');
            }},
            {
              text: 'Post Another',
              onPress: () => {
                console.log('Post Another pressed');
                setFormData({
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
                  rulesAccepted: false,
                });
                setSelectedImages([]);
              },
            },
          ]);
        }
        console.log('Success UI completed');
      } catch (notifyError) {
        console.error('Error showing success notification:', notifyError);
        // Still complete the process even if notification fails
      }

      console.log('Setting loading states to false...');
      setUploadingImages(false);
      setLoading(false);
      console.log('Deal creation process completed successfully');
    } catch (err: any) {
      console.error('Unexpected error creating deal:', err);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err.message === 'Deal creation timeout') {
        errorMessage = 'Deal creation is taking too long. Please check your connection and try again.';
      }
      
      notify('Deal Submission Failed', errorMessage);
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
    if (!formData.rulesAccepted) return notify('Community Rules', 'Please accept our community guidelines to continue.');

    // Price validation - require a valid price
    if (!formData.price.trim()) return notify('Missing Information', 'Please enter a price for the deal.');
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      return notify('Invalid Price', 'Please enter a valid price greater than 0.');
    }
    
    const originalPriceParsed = formData.originalPrice ? parseFloat(formData.originalPrice) : null;
    if (originalPriceParsed !== null && (isNaN(originalPriceParsed) || originalPriceParsed <= price)) {
      return notify('Invalid Original Price', 'Original price must be higher than current price.');
    }

    setLoading(true);

    // Set up safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout triggered - clearing loading states');
      setLoading(false);
      setUploadingImages(false);
      notify('Timeout Error', 'Operation took too long. Please try again.');
    }, 60000); // 60 second safety timeout

    try {
      let uploadedImageUrls: string[] = [];

      if (selectedImages.length > 0) {
        setUploadingImages(true);
        
        // Separate local images from external URLs for better debugging
        const localImages = selectedImages.filter(uri => !uri.startsWith('http'));
        const externalImages = selectedImages.filter(uri => uri.startsWith('http'));
        
        console.log(`Uploading ${localImages.length} local images and ${externalImages.length} external images`);
        
        // Set up upload timeout
        const uploadTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image upload timeout')), 45000)
        );

        const uploadPromise = storageService.uploadMultipleImages(selectedImages);
        
        try {
          const { data: uploadResults, error: uploadError } = await Promise.race([
            uploadPromise,
            uploadTimeoutPromise
          ]) as any;

          if (uploadError) {
            console.error('Error uploading images:', uploadError);
            
            // Handle partial uploads differently than complete failures
            if (uploadError.partial && uploadResults && uploadResults.length > 0) {
              // Some images uploaded successfully
              uploadedImageUrls = uploadResults.map((r: any) => r.url).filter(Boolean);
              notify('Some Images Failed', `${uploadedImageUrls.length} of ${selectedImages.length} images uploaded. ${uploadError.message}`);
            } else {
              // All images failed to upload
              const proceed = await confirm(
                'Image Upload Failed',
                `Images could not be uploaded: ${uploadError.message || 'Unknown error'}. Continue without images?`,
                'Continue',
                'Cancel'
              );
              if (!proceed) {
                clearTimeout(safetyTimeout);
                setUploadingImages(false);
                setLoading(false);
                return;
              }
              uploadedImageUrls = [];
            }
          } else {
            uploadedImageUrls = (uploadResults || []).map((r: any) => r.url).filter(Boolean);
            
            // Provide feedback if some images failed
            if (uploadedImageUrls.length < selectedImages.length) {
              const failed = selectedImages.length - uploadedImageUrls.length;
              notify('Partial Upload', `${uploadedImageUrls.length} of ${selectedImages.length} images uploaded successfully. ${failed} failed.`);
            } else if (uploadedImageUrls.length > 0) {
              console.log(`Successfully uploaded ${uploadedImageUrls.length} images`);
            }
          }
        } catch (uploadErr: any) {
          console.error('Upload timeout or error:', uploadErr);
          const proceed = await confirm(
            'Upload Timeout',
            'Image upload is taking too long. Continue without images?',
            'Continue',
            'Cancel'
          );
          if (!proceed) {
            clearTimeout(safetyTimeout);
            setUploadingImages(false);
            setLoading(false);
            return;
          }
          uploadedImageUrls = [];
        }
        
        setUploadingImages(false);
      }

      await createDealRecord(uploadedImageUrls);
      clearTimeout(safetyTimeout);
    } catch (err) {
      console.error('Unexpected error during deal submission:', err);
      notify('Connection Error', 'Unable to connect to the server. Please try again.');
      clearTimeout(safetyTimeout);
      setUploadingImages(false);
      setLoading(false);
    }
  };

  // -------------------- STORE MODAL HANDLERS --------------------
  const handleStoreModalSubmit = async (dealData: any) => {
    try {
      console.log('🏪 Store modal data received:', dealData);
      
      // Update form data with store modal data
      setFormData(prev => ({
        ...prev,
        title: dealData.title,
        description: dealData.description,
        price: dealData.price?.replace('$', '') || '',
        originalPrice: dealData.originalPrice?.replace('$', '') || '',
        dealUrl: dealData.url
      }));
      
      // Add image if provided
      if (dealData.imageUrl) {
        setSelectedImages(prev => [...prev, dealData.imageUrl].slice(0, 5));
      }
      
      // Set store if provided
      if (dealData.store) {
        const store = stores.find(s => s.name.toLowerCase().includes(dealData.store.toLowerCase()));
        if (store) {
          setFormData(prev => ({ ...prev, selectedStoreId: store.id }));
        }
      }
      
      notify('Store Data Applied!', `${dealData.store || 'Store'} deal data has been applied to the form.`, 'success');
    } catch (error) {
      console.error('Store modal error:', error);
      notify('Error', 'Failed to apply store data. Please try again.');
    }
  };

  const handleStoreModalClose = () => {
    setShowStoreModal(false);
    setStoreModalUrl('');
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
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Share a Deal</Text>
            <Text style={styles.headerSubtitle}>Help your community save money</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => router.push('/(tabs)/')}
          >
            <Home size={24} color="#fff" />
          </TouchableOpacity>
        </View>
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
        <View style={[styles.modalBackdrop, { pointerEvents: 'box-none' }]}>
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
          <Text style={styles.sectionTitle}>📝 Basic Information</Text>

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
            <Text style={styles.label}>Store (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                <TouchableOpacity
                  style={styles.categoryWrapper}
                  onPress={() => setFormData((p) => ({ ...p, selectedStoreId: '' }))}
                >
                  {!formData.selectedStoreId ? (
                    <LinearGradient colors={['#64748b', '#475569']} style={styles.categoryButton}>
                      <Text style={styles.categoryButtonTextActive}>No Store</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.categoryButtonInactive}>
                      <Text style={styles.categoryButtonText}>No Store</Text>
                    </View>
                  )}
                </TouchableOpacity>
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

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Pricing & Offers</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Sale Price (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <View style={styles.inputIcon}>
                  <DollarSign size={18} color="#10b981" />
                </View>
                <TextInput
                  style={styles.inputWithPadding}
                  placeholder="29.99 or leave empty"
                  value={formData.price}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, price: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.helpText}>For % off or coupon deals, leave empty</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Coupon Code (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="SAVE20"
              value={formData.couponCode}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, couponCode: text.toUpperCase() }))}
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.helpText}>Promo code customers can use at checkout</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Links & Location</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deal URL (Optional)</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.inputIcon}>
                {urlValidating ? (
                  <ActivityIndicator size={18} color="#6366f1" />
                ) : urlValid === true ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : urlValid === false ? (
                  <X size={18} color="#ef4444" />
                ) : (
                  <Zap size={18} color="#6366f1" />
                )}
              </View>
              <TextInput
                style={styles.inputWithPadding}
                placeholder="https://store.com/deal-link"
                value={formData.dealUrl}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, dealUrl: text }));
                  
                  // Check if this is a major store URL that should use the modal
                  if (text && isValidUrlFormat(text)) {
                    const { useModal, store } = shouldUseStoreModal(text);
                    if (useModal && store) {
                      // Show store-specific modal for Amazon, Walmart, Target
                      setStoreModalUrl(text);
                      setShowStoreModal(true);
                      return; // Don't proceed with normal validation
                    }
                  }
                  
                  // Reset validation state when typing
                  if (text !== formData.dealUrl) {
                    setUrlValid(null);
                    setExtractedImages([]);
                    setUrlMetadata(null);
                    setShowAutoFill(false);
                  }
                }}
                placeholderTextColor="#94a3b8"
                keyboardType="url"
              />
            </View>
            <View style={styles.helpTextContainer}>
              <Text style={styles.helpText}>
                {urlValidating 
                  ? '🔍 Checking URL and looking for images...' 
                  : urlValid === true 
                    ? '✅ URL is reachable and ready to use' 
                    : urlValid === false 
                      ? '❌ URL appears to be invalid or unreachable'
                      : 'Link to the deal on the store\'s website - we\'ll auto-check it!'
                }
              </Text>
              {urlValid === true && (
                <Text style={styles.helpTextSuccess}>
                  ✨ We'll automatically extract images and details when you enter the URL
                </Text>
              )}
            </View>

            {/* Auto-Fill Button */}
            {showAutoFill && urlMetadata && (
              <TouchableOpacity style={styles.autoFillButton} onPress={autoFillFromUrl}>
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.autoFillGradient}>
                  <Sparkles size={20} color="#FFFFFF" />
                  <View style={styles.autoFillContent}>
                    <Text style={styles.autoFillTitle}>🎯 Auto-Fill from URL</Text>
                    <Text style={styles.autoFillSubtitle}>
                      Found: {[
                        urlMetadata.title && 'title',
                        urlMetadata.category && 'category', 
                        urlMetadata.store && 'store',
                        urlMetadata.price && 'price',
                        urlMetadata.originalPrice && 'original price',
                        urlMetadata.couponCode && 'coupon code',
                        urlMetadata.images?.length > 0 && `${urlMetadata.images.length} images`
                      ].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  <Zap size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color="#6366f1" />
              </View>
              <TextInput
                style={styles.inputWithPadding}
                placeholder="City, State, Country or 'Online'"
                value={formData.city}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
                placeholderTextColor="#94a3b8"
              />
            </View>
            <Text style={styles.helpText}>Leave empty for global deals or enter specific location</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Photos & Expiry</Text>

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
              <Text style={styles.imageLimitText}>Max 5 photos, 2MB each • Auto-compressed for web</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Add Image URL Button */}
          <TouchableOpacity style={styles.addImageUrlButton} onPress={promptForImageUrl}>
            <View style={styles.addImageUrlContent}>
              <Text style={styles.addImageUrlIcon}>🔗</Text>
              <View style={styles.addImageUrlTextContainer}>
                <Text style={styles.addImageUrlText}>Add Image URL</Text>
                <Text style={styles.addImageUrlSubtext}>Amazon, eBay, or any direct image URL</Text>
              </View>
            </View>
          </TouchableOpacity>

          {extractedImages.length > 0 && selectedImages.length < 5 && (
            <View style={styles.extractedImagesContainer}>
              <Text style={styles.extractedImagesTitle}>Found Images from URL</Text>
              {urlMetadata?.store === 'Amazon' ? (
                <View style={styles.amazonImageHelpContainer}>
                  <View style={styles.addImageUrlTextContainer}>
                    <Text style={styles.extractedImagesSubtitle}>💡 Amazon Image URLs: Paste Amazon image URLs below (right-click Amazon product images → copy image address)</Text>
                  </View>
                  <View style={styles.amazonImageInputContainer}>
                    <TextInput
                      style={styles.amazonImageInput}
                      value={amazonImageUrl}
                      onChangeText={setAmazonImageUrl}
                      placeholder="Paste Amazon image URL here and press Enter"
                      placeholderTextColor="#94a3b8"
                      multiline={false}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const url = amazonImageUrl.trim();
                        if (url && url.includes('m.media-amazon.com/images/I/')) {
                          setSelectedImages(prev => [...prev, url].slice(0, 5));
                          notify('Amazon Image Added!', 'Amazon image URL added successfully!', 'success');
                          setAmazonImageUrl(''); // Clear the input
                        } else if (url) {
                          notify('Invalid URL', 'Please paste a valid Amazon image URL (should contain m.media-amazon.com/images/I/)', 'error');
                        }
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.addImageUrlTextContainer}>
                  <Text style={styles.extractedImagesSubtitle}>Tap images to add them to your deal</Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.extractedImagesList}>
                  {extractedImages.slice(0, 5 - selectedImages.length).map((uri, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.extractedImageItem}
                      onPress={() => addExtractedImages([uri])}
                    >
                      <View style={styles.extractedImageWrapper}>
                        <Image 
                          source={{ uri }} 
                          style={styles.extractedImagePreview}
                          onError={(error) => {
                            console.log(`Failed to load image: ${uri}`, error);
                          }}
                        />
                        <View style={styles.addImageOverlay}>
                          <Text style={styles.addImageText}>+</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {extractedImages.length > 1 && selectedImages.length + 1 < 5 && (
                    <TouchableOpacity 
                      style={styles.addAllImagesButton}
                      onPress={() => addExtractedImages(extractedImages.slice(0, 5 - selectedImages.length))}
                    >
                      <Text style={styles.addAllImagesText}>Add All ({Math.min(extractedImages.length, 5 - selectedImages.length)})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          )}

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

      {/* Store Modal for Amazon, Walmart, Target */}
      <StoreModal
        visible={showStoreModal}
        onClose={handleStoreModalClose}
        onSubmit={handleStoreModalSubmit}
        url={storeModalUrl}
      />
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
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    width: '100%' 
  },
  headerButton: { 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: 'rgba(255,255,255,0.2)' 
  },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center', 
    paddingHorizontal: 16 
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500', textAlign: 'center' },
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
  helpText: { fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  helpTextContainer: { marginTop: 4 },
  helpTextSuccess: { fontSize: 12, color: '#10b981', marginTop: 2, fontWeight: '600' },
  imageLimitText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  addImageUrlButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addImageUrlContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  addImageUrlIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addImageUrlText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  addImageUrlSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  extractedImagesContainer: {
    marginBottom: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  extractedImagesTitle: { fontSize: 16, fontWeight: '700', color: '#0c4a6e', marginBottom: 4 },
  extractedImagesSubtitle: { fontSize: 14, color: '#0369a1', marginBottom: 12 },
  amazonImageInputContainer: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  amazonImageInput: {
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 44,
    maxHeight: 88,
  },
  extractedImagesList: { flexDirection: 'row', paddingVertical: 8 },
  extractedImageItem: { position: 'relative', marginRight: 12 },
  extractedImagePreview: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0'
  },
  addImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  imagePreviewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(148, 163, 184, 0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewIcon: { 
    fontSize: 20, 
    color: '#FFFFFF', 
    marginBottom: 2 
  },
  imagePreviewText: { 
    fontSize: 10, 
    color: '#FFFFFF', 
    fontWeight: '600' 
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
  addAllImagesText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  autoFillButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  autoFillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  autoFillContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  autoFillTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  autoFillSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  addImageUrlTextContainer: {
    flex: 1,
  },
  amazonImageHelpContainer: {
    marginBottom: 10,
  },
  extractedImageWrapper: {
    position: 'relative',
  },
  bottomPadding: { height: 100 },
});
