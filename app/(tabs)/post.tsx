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
import { dealService } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { storageService } from '@/services/storageService';
import { apiClient } from '@/utils/apiClient';
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
    country: '',
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
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [scrapedAllImages, setScrapedAllImages] = useState<string[] | null>(null);
  const [showAllScraped, setShowAllScraped] = useState(false);
  const [scrapedData, setScrapedData] = useState<{ title?: string; price?: string; description?: string; images?: string[]; domain?: string } | null>(null);

  // Enhanced state variables
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState({
    title: [] as string[],
    description: '',
    tags: [] as string[]
  });
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [fullTitle, setFullTitle] = useState(''); // Store the full title

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
    const initialFormData = {
      title: '',
      description: '',
      price: '',
      originalPrice: '',
      selectedCategoryId: '',
      selectedStoreId: '',
      city: '',
      state: '',
      country: '',
      dealUrl: '',
      couponCode: '',
      rulesAccepted: false,
    };
    setFormData(initialFormData);
    setSelectedImages([]);
    setScrapedImages([]);
    setFullTitle('');
    setSuggestions({ title: [], description: '', tags: [] });
    setDiscountPercentage('');
    setDuplicates([]);
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
      
      // Clear any previous notices when this screen is focused so old success messages don't linger
      setNotice(null);

      return () => {
        // On blur (leaving the page), mark the time
        if (hasFormData) {
          // User left page with form data
        }
      };
    }, [hasFormData])
  );

  useEffect(() => {
    const loadFormData = async () => {
      setDataLoading(true);
      try {
        // Set a timeout for the entire loading operation (increased to 60s)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Loading timeout')), 60000)
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
      Alert.alert('Add Images', 'Choose how to add images', [
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
      // Check for duplicates
      if (!selectedImages.includes(asset.uri)) {
        setSelectedImages((prev) => [...prev, asset.uri]);
      } else {
        notify('Image Already Added', 'This image is already in your selection.', 'info');
      }
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
        // Filter out duplicates
        const uniqueNewImages = newImageUris.filter(uri => !prev.includes(uri));
        const combined = [...prev, ...uniqueNewImages];
        const finalImages = combined.slice(0, 5);
        
        // Notify if some images were duplicates
        if (uniqueNewImages.length < newImageUris.length) {
          const duplicates = newImageUris.length - uniqueNewImages.length;
          notify('Some Images Skipped', `${duplicates} image${duplicates > 1 ? 's were' : ' was'} already selected and skipped.`, 'info');
        }
        
        return finalImages;
      });
    }
  };

  const addScrapedImage = (imageUrl: string) => {
    if (selectedImages.length >= 5) {
      notify('Image Limit Reached', 'You can only add up to 5 images per deal.', 'error');
      return;
    }
    
    if (!selectedImages.includes(imageUrl)) {
      setSelectedImages(prev => [...prev, imageUrl]);
  // Remove from scraped images lists (filtered + all)
  setScrapedImages(prev => prev.filter(img => img !== imageUrl));
  setScrapedAllImages(prev => prev ? prev.filter(img => img !== imageUrl) : prev);
      notify('Image Added', 'Image added to your deal!', 'success');
    }
  };

  const addAllScrapedImages = () => {
    const remainingSlots = 5 - selectedImages.length;
    if (remainingSlots <= 0) {
      notify('Image Limit Reached', 'You can only add up to 5 images per deal.', 'error');
      return;
    }
    
    // Choose which scraped list is currently visible
    const sourceList = (showAllScraped && scrapedAllImages && scrapedAllImages.length > 0) ? scrapedAllImages : scrapedImages;

    // Filter out images that are already selected to prevent duplicates
    const imagesToAdd = (sourceList || [])
      .filter(img => !selectedImages.includes(img))
      .slice(0, remainingSlots);
    
    if (imagesToAdd.length === 0) {
      notify('No New Images', 'All scraped images are already selected.', 'info');
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imagesToAdd]);
    // Remove added images from both lists
    setScrapedImages(prev => prev.filter(img => !imagesToAdd.includes(img)));
    setScrapedAllImages(prev => prev ? prev.filter(img => !imagesToAdd.includes(img)) : prev);
    
    notify(`${imagesToAdd.length} image${imagesToAdd.length > 1 ? 's' : ''} added`, 'All available images added to your deal!', 'success');
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

    // Add to selected images (check for duplicates)
    if (!selectedImages.includes(url)) {
      setSelectedImages(prev => [...prev, url]);
      
      if (isAmazonImage) {
        notify('Amazon Image Added!', 'Amazon image URL added successfully!', 'success');
      } else if (isEbayImage) {
        notify('eBay Image Added!', 'eBay image URL added successfully!', 'success');
      } else {
        notify('Image Added!', 'Image URL added successfully!', 'success');
      }
    } else {
      notify('Image Already Added', 'This image is already in your selection.', 'info');
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
        images: [...uploadedImageUrls, ...selectedImages.filter(img => img.startsWith('http'))],
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

      // Set up timeout for deal creation (increased to 60s)
      const createDealTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Deal creation timeout')), 60000)
      );

      const createDealPromise = dealService.createDeal(dealData);
      
      const [error] = await Promise.race([
        createDealPromise,
        createDealTimeout
      ]) as any;
      
      if (error) {
        console.error('Error creating deal:', error);
        notify('Deal Submission Failed', error.message || 'Failed to create deal. Please try again.');
        setUploadingImages(false);
        setLoading(false);
        return;
      }

      const msg =
        dealData.status === 'live'
          ? 'Your deal is now live! Thanks for sharing with the community.'
          : "Your deal has been submitted for review. You'll be notified once it's approved!";

      try {
        if (isWeb) {
          notify('🎉 Deal Posted!', msg, 'success');
          
          // Reset form first, then navigate
          resetForm();
          
          setTimeout(() => {
            router.push('/profile');
          }, 1000);
        } else {
          Alert.alert('🎉 Deal Posted!', msg, [
            { text: 'View My Deals', onPress: () => {
              router.push('/profile');
            }},
            {
              text: 'Post Another',
              onPress: () => {
                resetForm();
              },
            },
          ]);
        }
      } catch (notifyError) {
        console.error('Error showing success notification:', notifyError);
        // Still complete the process even if notification fails
      }

      setUploadingImages(false);
      setLoading(false);
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
        
        // Set up upload timeout (increased to 60s)
        const uploadTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image upload timeout')), 60000)
        );

  // Only upload local images (file:// or relative URIs). External http(s) URLs are passed through.
  const localImagesToUpload = localImages;
  const uploadPromise = localImagesToUpload.length > 0 ? storageService.uploadMultipleImages(localImagesToUpload) : Promise.resolve({ data: [], error: null });
        
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
            if (uploadedImageUrls.length < localImages.length) {
              const failed = localImages.length - uploadedImageUrls.length;
              notify('Partial Upload', `${uploadedImageUrls.length} of ${localImages.length} local images uploaded successfully. ${failed} failed. External images will still be included.`);
            } else if (uploadedImageUrls.length > 0) {
              // Successfully uploaded images
            }
          }
        } catch (uploadErr: any) {
          console.error('Upload timeout or error:', uploadErr);
          const proceed = await confirm(
            'Upload Timeout',
            'Image upload is taking too long. Continue without uploading local images? External images will still be included.',
            'Continue',
            'Cancel'
          );
          if (!proceed) {
            clearTimeout(safetyTimeout);
            setUploadingImages(false);
            setLoading(false);
            return;
          }
          // Don't include external images here to avoid duplication
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

  const generateDescriptionFromTitle = (title: string): string => {
    const templates = [
      `Get the best deal on ${title}. Limited time offer with great savings!`,
      `Amazing discount on ${title}. Don't miss out on this incredible offer.`,
      `${title} at an unbeatable price. Shop now and save big!`,
      `Exclusive deal: ${title}. Premium quality at discounted rates.`,
      `Hot deal alert! ${title} with special pricing just for you.`
    ];
    
    let description = templates[Math.floor(Math.random() * templates.length)];
    
  // Keep fullTitle available separately; do not prepend it into the generated description
    
    return description;
  };

  const generateTagsFromTitle = (title: string): string[] => {
    const words = title.toLowerCase().split(' ');
    const commonTags = ['deal', 'discount', 'offer', 'sale', 'bargain', 'special', 'limited'];
    const relevantWords = words.filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'this', 'that'].includes(w));
    return [...new Set([...relevantWords, ...commonTags])].slice(0, 8);
  };

  // Function to shorten title intelligently
  const shortenTitle = (title: string, maxLength: number = 60): string => {
    if (title.length <= maxLength) return title;
    
    // Try to cut at word boundaries
    const words = title.split(' ');
    let shortTitle = '';
    
    for (const word of words) {
      if ((shortTitle + ' ' + word).length <= maxLength - 3) { // -3 for "..."
        shortTitle += (shortTitle ? ' ' : '') + word;
      } else {
        break;
      }
    }
    
    return shortTitle + (shortTitle.length < title.length ? '...' : '');
  };

  // Reusable input component
  const FormInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon: Icon,
    iconColor = '#6366f1',
    helpText,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    required = false
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    icon?: any;
    iconColor?: string;
    helpText?: string;
    keyboardType?: any;
    multiline?: boolean;
    numberOfLines?: number;
    required?: boolean;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}{required && ' *'}</Text>
      {Icon ? (
        <View style={styles.inputWithIcon}>
          <View style={[styles.inputIcon, { backgroundColor: `${iconColor}20` }]}>
            <Icon size={18} color={iconColor} />
          </View>
          <TextInput
            style={styles.inputWithPadding}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholderTextColor="#94a3b8"
            multiline={multiline}
            numberOfLines={numberOfLines}
          />
        </View>
      ) : (
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor="#94a3b8"
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      )}
      {helpText && (
        <View style={styles.helpTextContainer}>
          <Text style={styles.helpText}>{helpText}</Text>
        </View>
      )}
    </View>
  );

  // Enhanced URL change handler with auto-detection
  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, dealUrl: url }));

    // Clear scraped images when URL changes
    if (!url || !url.match(/^https?:\/\/.+/)) {
      setScrapedImages([]);
    }

    // Check if URL is valid and scrape
    if (url && url.match(/^https?:\/\/.+/)) {
      setScrapingLoading(true);
      try {
        const scrapedData = await apiClient.post('/api/scrape-product', { url }) as {
          title: string;
          price: string;
          description: string;
          images: string[];
          domain: string;
        };
        // Use server-provided short title (scrapedData.title) for the title input
        if (scrapedData.title && !formData.title) {
          setFormData(prev => ({ ...prev, title: scrapedData.title }));
        }

        // Use server-normalized price (already numeric) if available
        if (typeof scrapedData.price !== 'undefined' && scrapedData.price !== null && scrapedData.price !== '' && !formData.price) {
          // Server returns numeric-only price (e.g., '7999')
          setFormData(prev => ({ ...prev, price: String(scrapedData.price) }));
        }

        // Use fullTitle (server returns fullTitle) for the description preferentially
        if ((scrapedData as any).fullTitle && !formData.description) {
          // Remove repeated title occurrences conservatively and keep description readable
          let desc = (scrapedData.description || '').trim();
          const t = ((scrapedData as any).fullTitle || '').trim();
          try {
            if (t && desc) {
              // Remove exact title prefixes and any repeated full-title lines
              const lines = desc.split(/\n+/).map(l => l.trim()).filter(Boolean);
              // Drop leading lines that are equal or start with the title
              while (lines.length > 0 && lines[0].toLowerCase().startsWith(t.toLowerCase())) lines.shift();
              // Remove any other occurrences of the full title inside remaining text
              const esc = t.replace(/[.*+?^${}()|[\\]\\]/g, '\\\$&');
              const re = new RegExp(esc, 'gi');
              desc = lines.join('\n').replace(re, '').trim();
            }
          } catch (e) {}
          // Compose candidate description with title once at top
          const candidateDesc = t + (desc ? '\n\n' + desc : '');
          // Limit description length to avoid huge blobs in the form field
          const MAX_LEN = 2000;
          setFormData(prev => ({ ...prev, description: candidateDesc.length > MAX_LEN ? candidateDesc.slice(0, MAX_LEN) + '...' : candidateDesc }));
        } else if (scrapedData.description && !formData.description) {
          // If only description exists, strip any leading title occurrences more robustly
          let descOnly = (scrapedData.description || '').trim();
          const t = (scrapedData.title || '').trim();
          try {
            // Remove leading exact title lines
            const lines = descOnly.split(/\n+/).map(l => l.trim()).filter(Boolean);
            while (lines.length > 0 && t && lines[0].toLowerCase().startsWith(t.toLowerCase())) lines.shift();
            descOnly = lines.join('\n').trim();
          } catch (e) {}
          const MAX_LEN = 2000;
          setFormData(prev => ({ ...prev, description: descOnly.length > MAX_LEN ? descOnly.slice(0, MAX_LEN) + '...' : descOnly }));
        }
  // store full scraped payload for UI affordances
  setScrapedData(scrapedData);
        // For store, we can try to find or suggest
        if (scrapedData.domain) {
          // Find matching store
          const matchingStore = stores.find(store => 
            store.name.toLowerCase().includes(scrapedData.domain.split('.')[0]) ||
            scrapedData.domain.includes(store.name.toLowerCase())
          );
          if (matchingStore && !formData.selectedStoreId) {
            setFormData(prev => ({ ...prev, selectedStoreId: matchingStore.id.toString() }));
          }
        }
        if (scrapedData.images && scrapedData.images.length > 0) {
          // Store scraped images for manual selection (filtered)
          setScrapedImages(scrapedData.images);
          // Store the unfiltered list if provided
          if ((scrapedData as any).images_all && Array.isArray((scrapedData as any).images_all)) {
            setScrapedAllImages((scrapedData as any).images_all);
            // Default to showing all scraped images for Amazon domains
            if ((scrapedData as any).domain && /amazon\./i.test((scrapedData as any).domain)) {
              setShowAllScraped(true);
            }
          } else {
            setScrapedAllImages(null);
          }

          // Default to showing all scraped images for known Amazon domains
          try {
            if ((scrapedData as any).domain && /(^|\.)amazon\./i.test((scrapedData as any).domain)) {
              setShowAllScraped(true);
            }
          } catch (e) {}

          // Show notification about found images
          notify(`${scrapedData.images.length} image${scrapedData.images.length > 1 ? 's' : ''} found`, 'Images are available below for manual selection.', 'success');
        }
        // Wire scraped original price into the form if available and the originalPrice field is empty
        try {
          const orig = (scrapedData as any).original_price ?? (scrapedData as any).originalPrice ?? null;
          if (orig && !formData.originalPrice) {
            // Minimal normalization: strip currency symbols and commas, keep decimal point
            const clean = String(orig).replace(/[^0-9.]/g, '').replace(/^(\.+)/, '').trim();
            if (clean) {
              setFormData(prev => ({ ...prev, originalPrice: clean }));
              notify('Original price applied', `Using scraped original price: ${orig}`, 'success');
            }
          }
        } catch (e) {}
      } catch (error) {
        console.error('Scraping failed:', error);
      } finally {
        setScrapingLoading(false);
      }
    }
  };

  // Reusable component for category/store buttons
  const SelectionButton = ({ item, isSelected, onPress, isStore = false }: {
    item: Category | Store | null;
    isSelected: boolean;
    onPress: () => void;
    isStore?: boolean;
  }) => {
  const displayText = item ? (isStore ? (item as Store).name : (item as Category).name) : 'No Store';
    return (
      <TouchableOpacity style={styles.categoryWrapper} onPress={onPress}>
        {isSelected ? (
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.categoryButton}>
            {!isStore && item && <Text style={styles.categoryEmoji}>{(item as Category).emoji}</Text>}
            <Text style={styles.categoryButtonTextActive}>{displayText}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.categoryButtonInactive}>
            {!isStore && item && <Text style={styles.categoryEmojiInactive}>{(item as Category).emoji}</Text>}
            <Text style={styles.categoryButtonText}>{displayText}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Enhanced title change handler with suggestions and shortening
  const handleTitleChange = (title: string) => {
    setFullTitle(title); // Store the full title
    
    // Auto-shorten if title is too long
    const shortTitle = title.length > 60 ? shortenTitle(title, 60) : title;
    setFormData(prev => ({ ...prev, title: shortTitle }));

    if (title.length > 5) {
      // Generate description suggestion
      const description = generateDescriptionFromTitle(title);
      setSuggestions(prev => ({ ...prev, description }));

      // Generate tag suggestions
      const tags = generateTagsFromTitle(title);
      setSuggestions(prev => ({ ...prev, tags }));
    }
  };

  // Auto-calculate discount percentage
  const calculateDiscount = () => {
    const price = parseFloat(formData.price);
    const originalPrice = parseFloat(formData.originalPrice);

    if (price && originalPrice && originalPrice > price) {
      const discount = ((originalPrice - price) / originalPrice * 100).toFixed(0);
      setDiscountPercentage(discount);
    } else {
      setDiscountPercentage('');
    }
  };

  // Effect to calculate discount when prices change
  useEffect(() => {
    calculateDiscount();
  }, [formData.price, formData.originalPrice]);

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
              onChangeText={handleTitleChange}
              placeholderTextColor="#94a3b8"
            />
            {fullTitle && fullTitle !== formData.title && (
              <View style={styles.titleInfo}>
                <Text style={styles.titleInfoText}>
                  📝 Full title saved in description: {fullTitle}
                </Text>
              </View>
            )}
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
            {/* Use scraped description shortcut */}
            {scrapedData?.description && !formData.description && (
              <TouchableOpacity
                style={styles.suggestionButton}
                onPress={() => setFormData(prev => ({ ...prev, description: scrapedData.description || '' }))}
              >
                <Text style={styles.suggestionText}>💡 Use description from site: {scrapedData.description?.substring(0, 120)}{scrapedData.description && scrapedData.description.length > 120 ? '...' : ''}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Category & Store</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <SelectionButton
                    key={category.id}
                    item={category}
                    isSelected={formData.selectedCategoryId === category.id}
                    onPress={() => setFormData((p) => ({ ...p, selectedCategoryId: category.id }))}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Store (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                <SelectionButton
                  item={null}
                  isSelected={!formData.selectedStoreId}
                  onPress={() => setFormData((p) => ({ ...p, selectedStoreId: '' }))}
                  isStore={true}
                />
                {stores.map((store) => (
                  <SelectionButton
                    key={store.id}
                    item={store}
                    isSelected={formData.selectedStoreId === store.id}
                    onPress={() => setFormData((p) => ({ ...p, selectedStoreId: store.id }))}
                    isStore={true}
                  />
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
                {/* Use scraped price shortcut */}
                {scrapedData?.price && !formData.price && (
                  <TouchableOpacity style={{ marginTop: 8 }} onPress={() => {
                    const clean = (scrapedData.price || '').replace(/[$,₹,€,£,¥]/g, '').trim();
                    setFormData(prev => ({ ...prev, price: clean }));
                    notify('Price applied', `Using scraped price: ${clean}`, 'success');
                  }}>
                    <Text style={{ color: '#0369a1', fontWeight: '700' }}>Use scraped price: {scrapedData.price}</Text>
                  </TouchableOpacity>
                )}
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

          <FormInput
            label="Coupon Code"
            value={formData.couponCode}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, couponCode: text.toUpperCase() }))}
            placeholder="SAVE20"
            helpText="Promo code customers can use at checkout"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Links & Location</Text>

          <FormInput
            label="Deal URL"
            value={formData.dealUrl}
            onChangeText={handleUrlChange}
            placeholder="https://store.com/deal-link"
            icon={Zap}
            helpText="Link to the deal on the store's website"
            keyboardType="url"
          />

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

          {/* Duplicate Warning */}
          {duplicates.length > 0 && (
            <View style={styles.duplicateWarning}>
              <Text style={styles.duplicateWarningTitle}>⚠️ Potential Duplicates Found</Text>
              {duplicates.slice(0, 3).map((duplicate, index) => (
                <Text key={index} style={styles.duplicateItem}>
                  • {duplicate.title?.substring(0, 50)}...
                </Text>
              ))}
              <Text style={styles.duplicateWarningText}>
                Please verify this isn&apos;t a duplicate before posting.
              </Text>
            </View>
          )}

          {/* Description Suggestions */}
          {suggestions.description && formData.title && !formData.description && (
            <TouchableOpacity
              style={styles.suggestionButton}
              onPress={() => setFormData(prev => ({ ...prev, description: suggestions.description }))}
            >
              <Text style={styles.suggestionText}>
                💡 Use suggested description: {suggestions.description}
              </Text>
            </TouchableOpacity>
          )}

          <FormInput
            label="Location"
            value={formData.city}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, city: text }))}
            placeholder="City, State, Country or 'Online'"
            icon={MapPin}
            helpText="Leave empty for global deals or enter specific location"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Images</Text>

          {/* Selected Images Preview */}
          {selectedImages.length > 0 && (
            <View style={styles.selectedImagesContainer}>
              <Text style={styles.selectedImagesTitle}>Selected Images ({selectedImages.length}/5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedImagesScroll}>
                <View style={styles.selectedImagesList}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.selectedImageItem}>
                      <Image source={{ uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeSelectedImageButton}
                        onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Scraped Images Section */}
          {(scrapedImages.length > 0 || (scrapedAllImages && scrapedAllImages.length > 0)) && (
            <View style={styles.scrapedImagesSection}>
              <View style={styles.scrapedImagesHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.scrapedImagesTitle}>📸 Found Images ({showAllScraped ? (scrapedAllImages ? scrapedAllImages.length : 0) : scrapedImages.length})</Text>
                  {scrapedAllImages && scrapedAllImages.length > 0 && (
                    <TouchableOpacity onPress={() => setShowAllScraped(prev => !prev)} style={{ marginLeft: 8 }}>
                      <Text style={{ color: '#0369a1', fontSize: 13 }}>{showAllScraped ? 'Show Filtered' : 'Show All'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.addAllImagesButton}
                  onPress={addAllScrapedImages}
                >
                  <Text style={styles.addAllImagesText}>
                    Add All ({Math.min((showAllScraped && scrapedAllImages ? scrapedAllImages.length : scrapedImages.length), 5 - selectedImages.length)})
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.scrapedImagesSubtitle}>Click images to add them to your deal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrapedImagesScroll}>
                <View style={styles.scrapedImagesList}>
                  {(showAllScraped && scrapedAllImages ? scrapedAllImages : scrapedImages).map((uri, index) => (
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

          {/* Add Image URL Button */}
          <TouchableOpacity style={styles.addImageButton} onPress={promptForImageUrl}>
            <View style={styles.addImageContent}>
              <Text style={styles.addImageIcon}>🔗</Text>
              <View style={styles.addImageTextContainer}>
                <Text style={styles.addImageText}>Add Image URL</Text>
                <Text style={styles.addImageSubtext}>Paste direct image URL from web</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Upload Images Button - Only for verified/business users */}
          {(profile?.role === 'verified' || profile?.role === 'business' || profile?.role === 'admin' || profile?.role === 'superadmin') && (
            <TouchableOpacity style={styles.uploadImageButton} onPress={handleImagePicker}>
              <View style={styles.uploadImageContent}>
                <Upload size={20} color="#6366f1" />
                <View style={styles.uploadImageTextContainer}>
                  <Text style={styles.uploadImageText}>Upload Images</Text>
                  <Text style={styles.uploadImageSubtext}>Select from gallery or camera</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
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
  scrapingLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  scrapedImagesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  scrapedImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 4,
  },
  scrapedImagesSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  scrapedImageSelected: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 8,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  imagesScroll: {
    marginBottom: 8,
  },
  selectedImagesContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedImagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectedImagesScroll: {
    marginTop: 8,
  },
  selectedImagesList: {
    flexDirection: 'row',
  },
  selectedImageItem: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  removeSelectedImageButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrapedImagesSection: {
    marginBottom: 16,
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
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  scrapedImageOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrapedImageText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addImageButton: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addImageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addImageIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  addImageTextContainer: {
    flex: 1,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  addImageSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  uploadImageButton: {
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  uploadImageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadImageTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  uploadImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
  },
  uploadImageSubtext: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
  },

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
  fetchingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  fetchingText: { marginLeft: 8, color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  fetchingThumb: { width: 44, height: 44, borderRadius: 8, marginLeft: 8, backgroundColor: '#f1f5f9' },
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
  addImageUrlTextContainer: {
    flex: 1,
  },
  amazonImageHelpContainer: {
    marginBottom: 10,
  },
  duplicateWarning: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  duplicateWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  duplicateItem: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  duplicateWarningText: {
    fontSize: 12,
    color: '#856404',
    marginTop: 8,
  },
  suggestionButton: {
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
  },
  suggestionText: {
    fontSize: 14,
    color: '#0369a1',
    fontWeight: '500',
  },
  titleInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  titleInfoText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
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

  bottomPadding: { height: 100 },
});
