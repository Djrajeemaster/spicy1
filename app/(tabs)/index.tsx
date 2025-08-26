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
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Zap, TrendingUp, DollarSign, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import { EnhancedDealCard } from '@/components/EnhancedDealCard';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { locationService } from '@/services/locationService';
import { bannerService } from '@/services/bannerService';
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
  const [isDesktopView, setIsDesktopView] = useState(Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [windowWidth, setWindowWidth] = useState(Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : 1024);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'price_low' | 'price_high'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [selectedTags, setSelectedTags] = useState('');

  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [expiringSoon, setExpiringSoon] = useState(false);

  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const { user, profile } = useAuth();
  const isGuest = !user;
  const currentUserRole = (profile?.role as UserRole) || 'guest';
  const userReputation = profile?.reputation || 0;

  // aliveRef prevents setState on unmounted component
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // Handle window resize for responsive layout
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        const newIsDesktop = window.innerWidth >= 1024;
        setIsDesktopView(newIsDesktop);
        setWindowWidth(window.innerWidth);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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
      setBanners((bannersRes.data || []).filter((b: any) => b.is_active));
    } catch (err) {
      console.error('Error loading filter data:', err);
      setAvailableCategories([{ id: 'all' as any, name: 'All', emoji: '🔥' } as any]);
      setAvailableStores([{ id: 'all' as any, name: 'All' } as any]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    setAvailableCategories([{ id: 'all' as any, name: 'All', emoji: '🔥' } as any]);
    setAvailableStores([{ id: 'all' as any, name: 'All' } as any]);
    setBanners([]);
    setDataLoading(false);
  }, []);

  // ----- Deals loader -----
  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);
      const result = await dealService.getDeals({ sortBy, limit: 50 }, user?.id).catch(() => ({ data: [], error: 'Failed to load' }));
      
      if (result.data && result.data.length > 0) {
        const mappedData = result.data.map((d: any) => ({
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
      const { error } = await dealService.voteDeal(dealId.toString(), user!.id, voteType);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        onPostPress={navigateToPost}
        onAlertsPress={() => router.push('/alerts')}
        showSearch={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLocationToggle={handleLocationToggle}
        locationEnabled={locationEnabled}
        showFilters={showFilters}
        onFiltersToggle={() => setShowFilters(!showFilters)}
      />



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
            {isDesktopView ? (
              <View style={styles.dealsGrid}>
                {filteredDeals.map(deal => (
                  <View key={deal.id} style={[styles.dealTile, {
                    width: Platform.OS === 'web' ? (() => {
                      if (windowWidth >= 1600) return '18.5%';
                      if (windowWidth >= 1400) return '23%';
                      if (windowWidth >= 1200) return '30.5%';
                      if (windowWidth >= 1024) return '47%';
                      return '100%';
                    })() : '100%'
                  }]}>
                    <EnhancedDealCard
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
                <EnhancedDealCard
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  filterSection: { backgroundColor: '#FFFFFF', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  sortContainer: { paddingHorizontal: 20, paddingTop: 8 },
  sortLabel: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 12 },
  sortOptions: { flexDirection: 'row' },
  sortOptionWrapper: { marginRight: 12 },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sortOptionInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortEmoji: { fontSize: 14, marginRight: 6 },
  sortEmojiInactive: { fontSize: 14, marginRight: 6, opacity: 0.7 },
  sortOptionText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  sortOptionTextActive: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  advancedFilters: { paddingHorizontal: 20, marginTop: 20 },
  filterLabel: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 10, marginTop: 15 },
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
  storeFilterScroll: { paddingVertical: 8 },
  storeOptions: { flexDirection: 'row' },
  storeOptionWrapper: { marginRight: 12 },
  storeOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', marginBottom: 8,
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
  bannerCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  bannerGradient: { padding: 20 },
  bannerContent: { alignItems: 'center' },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  bannerDescription: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 20 },
  bottomPadding: { height: 100 },
  
  // Web tile layout
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
  },
  dealTile: {
    paddingHorizontal: 6,
    marginBottom: 12,
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
