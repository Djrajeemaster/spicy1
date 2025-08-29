import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Zap, TrendingUp, DollarSign, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import { EnhancedDealCardV2 } from '@/components/EnhancedDealCardV2';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { locationService } from '@/services/locationService';
import { bannerService, type Banner } from '@/services/bannerService';
import { router } from 'expo-router';
import { Database } from '@/types/database';



type Category = Database['public']['Tables']['categories']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

const RADIUS_OPTIONS = [1, 5, 10, 25];

export default function HomeScreen() {
  const [deals, setDeals] = useState<any[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedStores, setSelectedStores] = useState<string[]>(['all']);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Applied filters (these are the ones actually used for filtering)
  const [appliedFilters, setAppliedFilters] = useState({
    categories: ['all'] as string[],
    stores: ['all'] as string[],
    minPrice: '',
    maxPrice: '',
    minDiscount: '',
    selectedRadius: null as number | null,
    sortBy: 'newest' as 'newest' | 'popular' | 'price_low' | 'price_high' | 'expiring',
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'price_low' | 'price_high' | 'expiring'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [selectedTags, setSelectedTags] = useState('');

  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);

  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Dropdown states for desktop
  const [openDropdown, setOpenDropdown] = useState<'sort' | 'categories' | 'stores' | null>(null);

  const { user, profile } = useAuth();
  const isGuest = !user;
  const currentUserRole = (profile?.role as UserRole) || 'guest';
  const userReputation = profile?.reputation || 0;

  // aliveRef prevents setState on unmounted component
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // ----- Filters data (categories/stores) -----
  const loadFilterData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [categoriesRes, storesRes, bannersRes] = await Promise.all([
        categoryService.getCategories().catch(() => ({ data: [], error: null })),
        storeService.getStores().catch(() => ({ data: [], error: null })),
        bannerService.getBanners().catch(() => ({ data: [], error: null }))
      ]);

      setAvailableCategories([{ id: 'all' as any, name: 'All', emoji: '🔥' } as any, ...(categoriesRes.data || [])]);
      setAvailableStores([{ id: 'all' as any, name: 'All' } as any, ...(storesRes.data || [])]);
      setBanners((bannersRes.data || []).filter((b: Banner) => b.is_active));
    } catch (err) {
      console.error('Error loading filter data:', err);
      setAvailableCategories([{ id: 'all' as any, name: 'All', emoji: '🔥' } as any]);
      setAvailableStores([{ id: 'all' as any, name: 'All' } as any]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterData();
  }, [loadFilterData]);

  // ----- Deals loader -----
  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);
      const [error, data] = await dealService.getDeals({ sortBy, limit: 50 }, user?.id);
      
      if (data && data.length > 0) {
        const mappedData = data.map((d: any) => ({
          ...d,
          id: String(d.id),
          createdAt: d.created_at || new Date().toISOString(),
          created_at: d.created_at || new Date().toISOString(),
          category: d.category || {},
          store: d.store || {},
          postedBy: d.created_by_user?.username || 'Unknown',
          votes: { up: d.votes_up || 0, down: d.votes_down || 0 },
          votes_up: d.votes_up || 0,
          comments: d.comment_count || 0,
          image: d.images?.[0] || 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg',
          images: d.images || [],
          city: d.city || 'Online',
          distance: '0.5 miles',
          view_count: d.view_count || 0,
        }));
        setDeals(mappedData);
        setFilteredDeals(mappedData);
      } else if (error) {
        console.error('Failed to load deals:', error);
        setDeals([]);
        setFilteredDeals([]);
      } else {
        setDeals([]);
        setFilteredDeals([]);
      }
    } catch (error) {
      console.error('Error loading deals:', error);
      setDeals([]);
      setFilteredDeals([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, sortBy]);

  // initial + whenever filters change
  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Apply filters whenever search query or filter options change
  useEffect(() => {
    let filtered = [...deals];

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.title.toLowerCase().includes(query) ||
        deal.description?.toLowerCase().includes(query) ||
        deal.store?.name?.toLowerCase().includes(query) ||
        deal.category?.name?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (!selectedCategories.includes('all')) {
      filtered = filtered.filter(deal => 
        selectedCategories.includes(deal.category?.id?.toString() || '')
      );
    }

    // Apply store filter
    if (!selectedStores.includes('all')) {
      filtered = filtered.filter(deal => 
        selectedStores.includes(deal.store?.id?.toString() || '')
      );
    }

    // Apply price range filter
    if (minPrice.trim()) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        filtered = filtered.filter(deal => deal.price >= min);
      }
    }
    
    if (maxPrice.trim()) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter(deal => deal.price <= max);
      }
    }

    // Apply minimum discount filter
    if (minDiscount.trim()) {
      const minDiscountValue = parseFloat(minDiscount);
      if (!isNaN(minDiscountValue)) {
        filtered = filtered.filter(deal => {
          if (deal.originalPrice && deal.price) {
            const discount = ((deal.originalPrice - deal.price) / deal.originalPrice) * 100;
            return discount >= minDiscountValue;
          }
          return false;
        });
      }
    }

    // Apply location filter
    if (locationEnabled && userLocation && selectedRadius) {
      // Location filtering logic would go here
      // For now, we'll keep all deals as location filtering requires more complex logic
    }

    // Apply sorting to filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.votes_up || 0) - (a.votes_up || 0);
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'expiring':
          // Sort by expiration date (earliest expiring first)
          const aExpiry = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const bExpiry = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return aExpiry - bExpiry;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredDeals(filtered);
  }, [deals, searchQuery, selectedCategories, selectedStores, minPrice, maxPrice, minDiscount, locationEnabled, userLocation, selectedRadius, sortBy]);

  // Refresh deals when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDeals();
    }, [loadDeals])
  );



  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      if (id === 'all') return ['all'];
      const next = prev.includes('all') ? [] : [...prev];
      const idx = next.indexOf(id);
      if (idx >= 0) next.splice(idx, 1); else next.push(id);
      return next.length === 0 ? ['all'] : next;
    });
  };

  const toggleStore = (id: string) => {
    setSelectedStores(prev => {
      if (id === 'all') return ['all'];
      const next = prev.includes('all') ? [] : [...prev];
      const idx = next.indexOf(id);
      if (idx >= 0) next.splice(idx, 1); else next.push(id);
      return next.length === 0 ? ['all'] : next;
    });
  };

  const resetFilters = () => {
    setSelectedCategories(['all']);
    setSelectedStores(['all']);
    setMinPrice('');
    setMaxPrice('');
    setMinDiscount('');
    setSelectedTags('');
    setSelectedRadius(null);
    setSortBy('newest');
    setSearchQuery('');
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchQuery.trim() !== '' ||
           !selectedCategories.includes('all') ||
           !selectedStores.includes('all') ||
           minPrice.trim() !== '' ||
           maxPrice.trim() !== '' ||
           minDiscount.trim() !== '' ||
           (locationEnabled && selectedRadius !== null) ||
           sortBy !== 'newest';
  };

  const handleVote = async (dealId: number, voteType: 'up' | 'down') => {
    if (isGuest) {
      Alert.alert(
        "Join SpicyBeats",
        "Sign in to vote on deals and connect with the community!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Sign In", onPress: () => router.push('/sign-in') }
        ]
      );
      return;
    }

    try {
      const [error, data] = await dealService.voteDeal(dealId.toString(), user!.id, voteType);
      if (error) {
        console.error('Error voting:', error);
        return;
      }
      setDeals(prevDeals =>
        prevDeals.map(deal => {
          if (deal.id === dealId) {
            const newVotes = { ...deal.votes };
            if (voteType === 'up') newVotes.up += 1;
            else newVotes.down += 1;
            return { ...deal, votes: newVotes };
          }
          return deal;
        })
      );
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDeals();
    setIsRefreshing(false);
  };

  const handleLocationToggle = () => {
    if (!locationEnabled) {
      Alert.alert(
        "Enable Location",
        "Allow SpicyBeats to access your location for better deal recommendations?",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Allow",
            onPress: async () => {
              const { data: location, error } = await locationService.getCurrentLocation();
              if (error) {
                Alert.alert("Location Error", error);
                return;
              }
              setUserLocation(location);
              setLocationEnabled(true);
              Alert.alert("Location Enabled", `Now showing deals near ${location?.city || 'you'}!`);
            }
          }
        ]
      );
    } else {
      setLocationEnabled(false);
      setUserLocation(null);
      Alert.alert("Location Disabled", "Location services turned off.");
    }
  };

  const navigateToTrending = () => router.push('/updeals');
  const navigateToPost = () => router.push('/post');

  if (dataLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading filter options...</Text>
      </SafeAreaView>
    );
  }

  const numColumns = isDesktop ? (width > 1600 ? 5 : width > 1200 ? 4 : 3) : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        onPostPress={navigateToPost}
        onAlertsPress={() => router.push('/alerts')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLocationToggle={handleLocationToggle}
        locationEnabled={locationEnabled}
        showFilters={showFilters}
        onFiltersToggle={() => setShowFilters(!showFilters)}
        filtersActive={hasActiveFilters()}
      />

      {/* Sub-header with functional filters for Desktop */}
      {isDesktop && (
        <View style={styles.subHeader}>
          <View style={styles.subHeaderContent}>
            <View style={styles.subHeaderLeft}>
              <Text style={styles.subHeaderTitle}>Category:</Text>
              <TouchableOpacity 
                style={styles.subHeaderDropdown}
                onPress={() => setOpenDropdown(openDropdown === 'categories' ? null : 'categories')}
              >
                <Text style={styles.subHeaderValue}>
                  {selectedCategories.includes('all') || selectedCategories.length === 0 
                    ? '🔥 All Categories' 
                    : `🔥 ${availableCategories.find(c => c.id === selectedCategories[0])?.name || 'Selected'}`
                  }
                </Text>
                <Text style={styles.dropdownArrowSmall}>▼</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.subHeaderMiddle}>
              <Text style={styles.subHeaderTitle}>Store:</Text>
              <TouchableOpacity 
                style={styles.subHeaderDropdown}
                onPress={() => setOpenDropdown(openDropdown === 'stores' ? null : 'stores')}
              >
                <Text style={styles.subHeaderValue}>
                  {selectedStores.includes('all') || selectedStores.length === 0 
                    ? '🏪 All Stores' 
                    : `🏪 ${availableStores.find(s => s.id === selectedStores[0])?.name || 'Selected'}`
                  }
                </Text>
                <Text style={styles.dropdownArrowSmall}>▼</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.subHeaderMiddle}>
              <Text style={styles.subHeaderTitle}>Location:</Text>
              <TouchableOpacity style={styles.subHeaderDropdown}>
                <Text style={styles.subHeaderValue}>📍 All Locations</Text>
                <Text style={styles.dropdownArrowSmall}>▼</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.subHeaderRight}>
              <View style={styles.sortPillsDisplay}>
                <TouchableOpacity 
                  style={[styles.sortPillSmall, sortBy === 'newest' && styles.sortPillActive]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text style={[styles.sortPillInactiveText, sortBy === 'newest' && styles.sortPillActiveText]}>🔥 Hot</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sortPillSmall, sortBy === 'popular' && styles.sortPillActive]}
                  onPress={() => setSortBy('popular')}
                >
                  <Text style={[styles.sortPillInactiveText, sortBy === 'popular' && styles.sortPillActiveText]}>⭐ Popular</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sortPillSmall, sortBy === 'newest' && styles.sortPillActive]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text style={[styles.sortPillInactiveText, sortBy === 'newest' && styles.sortPillActiveText]}>📄 Newest</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sortPillSmall, (sortBy === 'price_low' || sortBy === 'price_high') && styles.sortPillActive]}
                  onPress={() => setSortBy('price_low')}
                >
                  <Text style={[styles.sortPillInactiveText, (sortBy === 'price_low' || sortBy === 'price_high') && styles.sortPillActiveText]}>💰 Price</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.sortPillSmall, sortBy === 'expiring' && styles.sortPillActive]}
                  onPress={() => setSortBy('expiring')}
                >
                  <Text style={[styles.sortPillInactiveText, sortBy === 'expiring' && styles.sortPillActiveText]}>⏰ Expiring</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Sub-header Dropdown Backdrop */}
      {openDropdown && isDesktop && (
        <TouchableOpacity 
          style={styles.subHeaderDropdownBackdrop}
          onPress={() => setOpenDropdown(null)}
          activeOpacity={1}
        />
      )}

      {/* Filter Backdrop for Desktop */}
      {showFilters && isDesktop && (
        <TouchableOpacity 
          style={styles.filterBackdrop}
          onPress={() => {
            setShowFilters(false);
            setOpenDropdown(null);
          }}
          activeOpacity={1}
        />
      )}

      {/* Dropdown Backdrop - closes dropdowns when clicking outside */}
      {openDropdown && isDesktop && (
        <TouchableOpacity 
          style={styles.dropdownBackdrop}
          onPress={() => setOpenDropdown(null)}
          activeOpacity={1}
        />
      )}

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filterSection, isDesktop && styles.filterSectionDesktop]}>
          <ScrollView 
            style={styles.filterScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
            onTouchStart={() => setOpenDropdown(null)}
          >
            {/* Sort Options */}
            <View style={[styles.sortContainer, { zIndex: 3000 }]}>
              <Text style={styles.filterLabel}>Sort By</Text>
              {isDesktop ? (
                <View style={[styles.dropdownContainer, { zIndex: 3000 }]}>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => {
                      const newDropdown = openDropdown === 'sort' ? null : 'sort';
                      setOpenDropdown(newDropdown);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {sortBy === 'newest' ? '🕐 Newest' :
                       sortBy === 'popular' ? '🔥 Popular' :
                       sortBy === 'price_low' ? '💰 Price: Low' :
                       sortBy === 'price_high' ? '💎 Price: High' :
                       sortBy === 'expiring' ? '⏰ Expiring Soon' :
                       '🕐 Newest'}
                    </Text>
                    <Text style={[styles.dropdownArrow, openDropdown === 'sort' && styles.dropdownArrowOpen]}>▼</Text>
                  </TouchableOpacity>
                  {openDropdown === 'sort' && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                        {[
                          { key: 'newest', label: 'Newest', emoji: '🕐' },
                          { key: 'popular', label: 'Popular', emoji: '🔥' },
                          { key: 'price_low', label: 'Price: Low', emoji: '💰' },
                          { key: 'price_high', label: 'Price: High', emoji: '💎' },
                          { key: 'expiring', label: 'Expiring Soon', emoji: '⏰' },
                        ].map(option => (
                          <TouchableOpacity
                            key={option.key}
                            style={[styles.dropdownItem, sortBy === option.key && styles.dropdownItemActive]}
                            onPress={() => {
                              setSortBy(option.key as any);
                              setOpenDropdown(null);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, sortBy === option.key && styles.dropdownItemTextActive]}>
                              {option.emoji} {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                >
                  <View style={styles.sortOptions}>
                    {[
                      { key: 'newest', label: 'Newest', emoji: '🕐' },
                      { key: 'popular', label: 'Popular', emoji: '🔥' },
                      { key: 'price_low', label: 'Price: Low', emoji: '💰' },
                      { key: 'price_high', label: 'Price: High', emoji: '💎' },
                      { key: 'expiring', label: 'Expiring Soon', emoji: '⏰' },
                    ].map(option => (
                      <TouchableOpacity
                        key={option.key}
                        style={styles.sortOptionWrapper}
                        onPress={() => setSortBy(option.key as any)}
                      >
                        {sortBy === option.key ? (
                          <LinearGradient
                            colors={['#6366f1', '#4f46e5']}
                            style={styles.sortOption}
                          >
                            <Text style={styles.sortEmoji}>{option.emoji}</Text>
                            <Text style={styles.sortOptionTextActive}>{option.label}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.sortOptionInactive}>
                            <Text style={styles.sortEmojiInactive}>{option.emoji}</Text>
                            <Text style={styles.sortOptionText}>{option.label}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Advanced Filters */}
            <View style={styles.advancedFilters}>
              {/* Price Range */}
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceInputs}>
                <View style={styles.inputWithIcon}>
                  <DollarSign size={16} color="#6366f1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Min"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    onFocus={() => setOpenDropdown(null)}
                  />
                </View>
                <Text style={styles.priceSeparator}>—</Text>
                <View style={styles.inputWithIcon}>
                  <DollarSign size={16} color="#6366f1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Max"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    onFocus={() => setOpenDropdown(null)}
                  />
                </View>
              </View>

              {/* Minimum Discount */}
              <Text style={styles.filterLabel}>Minimum Discount (%)</Text>
              <View style={styles.inputWithIcon}>
                <Percent size={16} color="#6366f1" style={styles.inputIcon} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g. 20"
                  value={minDiscount}
                  onChangeText={setMinDiscount}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  onFocus={() => setOpenDropdown(null)}
                />
              </View>

              {/* Category Filter */}
              <Text style={styles.filterLabel}>Categories</Text>
              {isDesktop ? (
                <View style={[styles.dropdownContainer, { zIndex: 2000 }]}>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => {
                      const newDropdown = openDropdown === 'categories' ? null : 'categories';
                      setOpenDropdown(newDropdown);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedCategories.includes('all') || selectedCategories.length === 0 
                        ? 'All Categories' 
                        : selectedCategories.length === 1 
                        ? availableCategories.find(cat => cat.id.toString() === selectedCategories[0])?.name || 'All Categories'
                        : `${selectedCategories.length} Categories Selected`
                      }
                    </Text>
                    <Text style={[styles.dropdownArrow, openDropdown === 'categories' && styles.dropdownArrowOpen]}>▼</Text>
                  </TouchableOpacity>
                  {openDropdown === 'categories' && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                        <TouchableOpacity
                          style={[styles.dropdownItem, (selectedCategories.includes('all') || selectedCategories.length === 0) && styles.dropdownItemActive]}
                          onPress={() => {
                            setSelectedCategories(['all']);
                            setOpenDropdown(null);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, (selectedCategories.includes('all') || selectedCategories.length === 0) && styles.dropdownItemTextActive]}>
                            🔥 All Categories
                          </Text>
                        </TouchableOpacity>
                        {availableCategories.filter(category => category.id !== 'all').map((category, index, filteredCategories) => (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              styles.dropdownItem, 
                              selectedCategories.includes(category.id.toString()) && !selectedCategories.includes('all') && styles.dropdownItemActive,
                              index === filteredCategories.length - 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => {
                              toggleCategory(category.id.toString());
                              setOpenDropdown(null);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, selectedCategories.includes(category.id.toString()) && !selectedCategories.includes('all') && styles.dropdownItemTextActive]}>
                              {category.emoji} {category.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.storeFilterScroll}
                >
                  <View style={styles.storeOptions}>
                    {availableCategories.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.storeOptionWrapper}
                        onPress={() => toggleCategory(category.id.toString())}
                      >
                        {selectedCategories.includes(category.id.toString()) ? (
                          <LinearGradient
                            colors={['#6366f1', '#4f46e5']}
                            style={styles.storeOption}
                          >
                            <Text style={styles.storeOptionTextActive}>
                              {category.emoji} {category.name}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.storeOptionInactive}>
                            <Text style={styles.storeOptionText}>
                              {category.emoji} {category.name}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Store Filter */}
              <Text style={styles.filterLabel}>Stores</Text>
              {isDesktop ? (
                <View style={[styles.dropdownContainer, { zIndex: 1000 }]}>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => {
                      const newDropdown = openDropdown === 'stores' ? null : 'stores';
                      setOpenDropdown(newDropdown);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {selectedStores.includes('all') || selectedStores.length === 0 
                        ? 'All Stores' 
                        : selectedStores.length === 1 
                        ? availableStores.find(store => store.id.toString() === selectedStores[0])?.name || 'All Stores'
                        : `${selectedStores.length} Stores Selected`
                      }
                    </Text>
                    <Text style={[styles.dropdownArrow, openDropdown === 'stores' && styles.dropdownArrowOpen]}>▼</Text>
                  </TouchableOpacity>
                  {openDropdown === 'stores' && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                        <TouchableOpacity
                          style={[styles.dropdownItem, (selectedStores.includes('all') || selectedStores.length === 0) && styles.dropdownItemActive]}
                          onPress={() => {
                            setSelectedStores(['all']);
                            setOpenDropdown(null);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, (selectedStores.includes('all') || selectedStores.length === 0) && styles.dropdownItemTextActive]}>
                            🏪 All Stores
                          </Text>
                        </TouchableOpacity>
                        {availableStores.filter(store => store.id !== 'all').map((store, index, filteredStores) => (
                          <TouchableOpacity
                            key={store.id}
                            style={[
                              styles.dropdownItem, 
                              selectedStores.includes(store.id.toString()) && !selectedStores.includes('all') && styles.dropdownItemActive,
                              index === filteredStores.length - 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => {
                              toggleStore(store.id.toString());
                              setOpenDropdown(null);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, selectedStores.includes(store.id.toString()) && !selectedStores.includes('all') && styles.dropdownItemTextActive]}>
                              {store.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.storeFilterScroll}
                >
                  <View style={styles.storeOptions}>
                    {availableStores.map(store => (
                      <TouchableOpacity
                        key={store.id}
                        style={styles.storeOptionWrapper}
                        onPress={() => toggleStore(store.id.toString())}
                      >
                        {selectedStores.includes(store.id.toString()) ? (
                          <LinearGradient
                            colors={['#6366f1', '#4f46e5']}
                            style={styles.storeOption}
                          >
                            <Text style={styles.storeOptionTextActive}>{store.name}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.storeOptionInactive}>
                            <Text style={styles.storeOptionText}>{store.name}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Location Options */}
              {locationEnabled && (
                <>
                  <Text style={styles.filterLabel}>Search Radius</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.storeFilterScroll}
                  >
                    <View style={styles.storeOptions}>
                      {RADIUS_OPTIONS.map(radius => (
                        <TouchableOpacity
                          key={radius}
                          style={styles.storeOptionWrapper}
                          onPress={() => setSelectedRadius(radius)}
                        >
                          {selectedRadius === radius ? (
                            <LinearGradient
                              colors={['#10b981', '#059669']}
                              style={styles.storeOption}
                            >
                              <Text style={styles.storeOptionTextActive}>{radius} mi</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.storeOptionInactive}>
                              <Text style={styles.storeOptionText}>{radius} mi</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Action Buttons */}
              <View style={styles.filterActions}>
                <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}



      <ScrollView
        style={styles.dealsContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading deals...</Text>
          </View>
        ) : (
          <>
            {/* Banners Section */}
            {banners.length > 0 && (
              <View style={styles.bannersContainer}>
                {banners.map((banner: Banner) => (
                  <LinearGradient
                    key={banner.id}
                    colors={['#667eea', '#764ba2']}
                    style={[
                      styles.bannerCard,
                      isDesktop && styles.desktopBannerCard
                    ]}
                  >
                    <View style={[
                      styles.bannerContent,
                      isDesktop && styles.desktopBannerContent
                    ]}>
                      <View style={styles.bannerText}>
                        <Text style={[
                          styles.bannerTitle,
                          isDesktop && styles.desktopBannerTitle
                        ]}>
                          {banner.title}
                        </Text>
                        <Text style={[
                          styles.bannerSubtitle,
                          isDesktop && styles.desktopBannerSubtitle
                        ]}>
                          {banner.description}
                        </Text>
                        {isDesktop && (
                          <TouchableOpacity style={styles.bannerCta}>
                            <Text style={styles.bannerCtaText}>Learn More</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {isDesktop && (
                        <Text style={styles.bannerEmoji}>🎯</Text>
                      )}
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}

            {/* Stats Header Section for Desktop */}
            {isDesktop && (
              <View style={styles.statsHeader}>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{filteredDeals.length.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>active deals</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{Math.floor(filteredDeals.length * 0.07)}</Text>
                    <Text style={styles.statLabel}>trending now</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{Math.floor(filteredDeals.length * 0.01)}</Text>
                    <Text style={styles.statLabel}>expiring soon</Text>
                  </View>
                </View>
                <View style={styles.viewToggle}>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>🔲 Grid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.viewButton, styles.viewButtonInactive]}>
                    <Text style={[styles.viewButtonText, styles.viewButtonTextInactive]}>📄 List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.viewButton, styles.viewButtonInactive]}>
                    <Text style={[styles.viewButtonText, styles.viewButtonTextInactive]}>📦 Compact</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {numColumns > 1 ? (
              <View style={styles.dealsGrid}>
                {filteredDeals.map(deal => (
                  <View key={deal.id} style={{ width: `${100 / numColumns}%`, padding: 4 }}>
                    <EnhancedDealCardV2
                      deal={deal}
                      isGuest={isGuest}
                      onVote={handleVote}
                      userRole={currentUserRole}
                      userId={user?.id}
                    />
                  </View>
                ))}
              </View>
            ) : (
              filteredDeals.map(deal => (
                <EnhancedDealCardV2
                  key={deal.id}
                  deal={deal}
                  isGuest={isGuest}
                  onVote={handleVote}
                  userRole={currentUserRole}
                  userId={user?.id}
                />
              ))
            )}
          </>
        )}

        {filteredDeals.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateEmoji}>🔍</Text>
              <Text style={styles.emptyStateText}>No deals found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? `No results for "${searchQuery}"` : 'Try adjusting your filters to discover amazing deals'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              ) : null}
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating dropdowns for sub-header - rendered on top */}
      {isDesktop && openDropdown === 'categories' && (
        <View style={styles.floatingDropdownContainer}>
          <View style={[styles.subHeaderDropdownMenu, { left: 20, top: 102 }]}>
            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
              <TouchableOpacity
                style={styles.subHeaderDropdownItem}
                onPress={() => {
                  setSelectedCategories(['all']);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.subHeaderDropdownText}>🔥 All Categories</Text>
              </TouchableOpacity>
              {availableCategories.filter(cat => cat.id !== 'all').map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.subHeaderDropdownItem}
                  onPress={() => {
                    setSelectedCategories([category.id]);
                    setOpenDropdown(null);
                  }}
                >
                  <Text style={styles.subHeaderDropdownText}>
                    {category.emoji} {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {isDesktop && openDropdown === 'stores' && (
        <View style={styles.floatingDropdownContainer}>
          <View style={[styles.subHeaderDropdownMenu, { left: 200, top: 102 }]}>
            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
              <TouchableOpacity
                style={styles.subHeaderDropdownItem}
                onPress={() => {
                  setSelectedStores(['all']);
                  setOpenDropdown(null);
                }}
              >
                <Text style={styles.subHeaderDropdownText}>🏪 All Stores</Text>
              </TouchableOpacity>
              {availableStores.filter(store => store.id !== 'all').map(store => (
                <TouchableOpacity
                  key={store.id}
                  style={styles.subHeaderDropdownItem}
                  onPress={() => {
                    setSelectedStores([store.id]);
                    setOpenDropdown(null);
                  }}
                >
                  <Text style={styles.subHeaderDropdownText}>
                    🏪 {store.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  filterSection: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', maxHeight: '70%' },
  filterSectionDesktop: {
    position: 'absolute',
    top: 45,
    right: 20,
    width: 360,
    maxHeight: 700,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 999,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 5000,
  },
  filterScrollView: { flex: 1 },
  filterContent: { paddingBottom: 100 },
  sortContainer: { paddingHorizontal: 20, paddingTop: 4 },
  sortLabel: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 8 },
  sortOptions: { flexDirection: 'row', paddingHorizontal: 4, paddingRight: 20 },
  sortOptionWrapper: { marginRight: 12 },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 100 },
  sortOptionInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 100,
  },
  sortEmoji: { fontSize: 14, marginRight: 6 },
  sortEmojiInactive: { fontSize: 14, marginRight: 6, opacity: 0.7 },
  sortOptionText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  sortOptionTextActive: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  advancedFilters: { paddingHorizontal: 20, marginTop: 12 },
  filterLabel: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 12 },
  priceInputs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    flex: 1,
  },
  inputIcon: { marginRight: 8 },
  filterInput: { flex: 1, height: 48, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  filterItemWithSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  priceSeparator: { fontSize: 18, color: '#94a3b8', marginHorizontal: 10, fontWeight: 'bold' },
  storeFilterScroll: { paddingVertical: 8, minHeight: 50 },
  storeOptions: { flexDirection: 'row', paddingHorizontal: 4, paddingRight: 20 },
  storeOptionWrapper: { marginRight: 12 },
  storeOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, minWidth: 60 },
  storeOptionInactive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  storeOptionText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  storeOptionTextActive: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  dealsContainer: { flex: 1 },
  statsHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: '#f8fafc', 
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsItem: { flexDirection: 'row', alignItems: 'center' },
  statsText: { fontSize: 14, fontWeight: '600', color: '#64748b', marginLeft: 6 },
  trendingLink: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
  locationBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  locationBannerGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  locationBannerText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
  emptyState: { padding: 20 },
  emptyStateContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, borderRadius: 20 },
  emptyStateEmoji: { fontSize: 48, marginBottom: 16 },
  emptyStateText: { fontSize: 20, fontWeight: '700', color: '#64748b', marginBottom: 8, textAlign: 'center' },
  emptyStateSubtext: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  clearSearchButton: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  clearSearchText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bannersContainer: { marginHorizontal: 16, marginBottom: 8 },
  bannerCard: { 
    marginBottom: 12, 
    borderRadius: 16, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerGradient: { padding: 20 },
  bannerContent: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  bannerDescription: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  bannerCta: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
  },
  bannerCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerEmoji: {
    fontSize: 32,
    marginLeft: 16,
  },
  
  // Desktop-specific banner styles
  desktopBannerCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  desktopBannerContent: {
    padding: 24,
  },
  desktopBannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  desktopBannerSubtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  bottomPadding: { height: 100 },
  
  // Web tile layout
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  dealTile: {
    // This style is now handled inline with dynamic width and padding
  },

  // Filter action styles
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    minWidth: 120,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },

  // Dropdown styles for desktop
  dropdownContainer: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 999,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 8,
    transform: [{ rotate: '0deg' }],
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 999,
    zIndex: 9999,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'visible',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  dropdownItemTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  
  // Stats section styles
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#d1d5db',
    marginHorizontal: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#6366f1',
  },
  viewButtonInactive: {
    backgroundColor: '#ffffff',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewButtonTextInactive: {
    color: '#64748b',
  },
  
  // Sub-header styles
  subHeader: {
    backgroundColor: '#4f46e5',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 42,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 50,
    zIndex: 50,
    position: 'relative',
  },
  subHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 24,
  },
  subHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 9999,
  },
  subHeaderMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 9998,
  },
  subHeaderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  subHeaderTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  subHeaderValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  sortPillsDisplay: {
    flexDirection: 'row',
    gap: 6,
  },
  sortPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sortPillActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  sortPillActiveText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '600',
  },
  sortPillInactiveText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Sub-header dropdown styles
  subHeaderDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    zIndex: 99999,
  },
  dropdownArrowSmall: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginLeft: 4,
  },
  subHeaderDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 99999,
    zIndex: 99999,
    minWidth: 160,
    marginTop: 4,
    maxHeight: 200,
  },
  subHeaderDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  subHeaderDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  
  // Sub-header backdrop
  subHeaderDropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 50000,
    elevation: 50000,
  },
  
  // Floating dropdown container
  floatingDropdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    pointerEvents: 'box-none',
  },
});

// Sample data (unchanged)
function getSampleDeals() {
  return [
    {
      id: 1,
      title: "Premium Wireless Headphones - Limited Flash Sale",
      description: "Sony WH-1000XM5 with industry-leading noise cancellation. Today only!",
      price: 149.99,
      originalPrice: 299.99,
      category: { id: 'electronics', name: 'Electronics', emoji: '📱' },
      store: { id: 'bestbuy', name: 'Best Buy', slug: 'best-buy', logo_url: null, verified: true },
      location: "Best Buy Downtown",
      distance: "0.5 miles",
      image: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400",
      votes: { up: 124, down: 3 },
      comments: 28,
      isPinned: true,
      status: 'approved',
      postedBy: "TechDeals2024",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isVerified: true,
      posterRole: 'verified' as UserRole,
      posterReputation: 4.8,
      isSample: true,
      tags: ['electronics', 'clearance'],
    },
    {
      id: 2,
      title: "Artisan Pizza - Buy One Get One Free",
      description: "Hand-tossed wood-fired pizzas made with organic ingredients. All day Monday special.",
      price: 12.99,
      category: { id: 'food', name: 'Food & Dining', emoji: '🍕' },
      store: { id: "marios", name: "Mario's Pizzeria", slug: 'marios-pizzeria', logo_url: null, verified: false },
      location: "Mario's Authentic Pizzeria",
      distance: "1.2 miles",
      image: "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400",
      votes: { up: 89, down: 2 },
      comments: 15,
      isPinned: false,
      status: 'approved',
      postedBy: "FoodieExplorer",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      isVerified: false,
      posterRole: 'user' as UserRole,
      posterReputation: 3.2,
      isSample: true,
      tags: ['food', 'bogo'],
    },
  ];
}
