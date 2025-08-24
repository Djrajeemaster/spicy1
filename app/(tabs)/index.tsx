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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Zap, TrendingUp, DollarSign, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { storeService } from '@/services/storeService';
import { locationService } from '@/services/locationService';
import { router } from 'expo-router';
import { Database } from '@/types/database';

// ---------- Helpers ----------
function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('request_timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
// -----------------------------

type Category = Database['public']['Tables']['categories']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

const RADIUS_OPTIONS = [1, 5, 10, 25];

export default function HomeScreen() {
  const [deals, setDeals] = useState<any[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedStores, setSelectedStores] = useState<string[]>(['all']);

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
  const [dataLoading, setDataLoading] = useState(true);

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
      const [
        { data: fetchedCategories, error: catErr },
        { data: fetchedStores, error: storeErr },
      ] = await Promise.all([
        withTimeout(categoryService.getCategories(), 10000),
        withTimeout(storeService.getStores(), 10000),
      ]);

      if (!aliveRef.current) return;

      if (catErr) console.error('Error fetching categories:', catErr);
      if (storeErr) console.error('Error fetching stores:', storeErr);

      setAvailableCategories([{ id: 'all' as any, name: 'All', emoji: '🔥' } as any, ...(fetchedCategories || [])]);
      setAvailableStores([{ id: 'all' as any, name: 'All' } as any, ...(fetchedStores || [])]);
    } catch (err) {
      console.error('Unexpected error loading filter data:', err);
      if (!aliveRef.current) return;
      // Ensure UI doesn't hang
      setAvailableCategories([{ id: 'all' as any, name: 'All', emoji: '🔥' } as any]);
      setAvailableStores([{ id: 'all' as any, name: 'All' } as any]);
    } finally {
      if (aliveRef.current) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterData();
  }, [loadFilterData]);

  // ----- Deals loader -----
  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);

      const tags = selectedTags.split(',').map(t => t.trim()).filter(Boolean);
      const catFilter = selectedCategories.filter(c => c !== 'all');
      const storeFilter = selectedStores.filter(s => s !== 'all');

      const filters: any = {
        sortBy,
        limit: 50,
        categories: catFilter.length ? catFilter : undefined,
        stores: storeFilter.length ? storeFilter : undefined,
        search: searchQuery.trim() === '' ? undefined : searchQuery.trim(),
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minDiscount: minDiscount ? parseInt(minDiscount) : undefined,
        tags: tags.length ? tags : undefined,
        expiringOnly: expiringSoon,
      };

      if (locationEnabled && userLocation) {
        filters.userLocation = userLocation;
        if (selectedRadius != null) filters.radius = selectedRadius;
      }

      const { data, error } = await withTimeout(
        dealService.getDeals(filters, user?.id),
        10000
      );

      if (!aliveRef.current) return;

      if (error) {
        console.error('Error loading deals from Supabase:', error);
        Alert.alert(
          'Loading Demo Data',
          'Unable to connect to the database. Showing sample deals for demonstration.',
          [{ text: 'OK' }]
        );
        const sample = getSampleDeals();
        setDeals(sample);
        setFilteredDeals(sample);
      } else {
        if (data && data.length > 0) {
          const mappedData = data.map((d: any) => ({
            ...d,
            createdAt: d.created_at,
            isSample: false,
            category: d.category,
            store: d.store,
            postedBy: d.created_by_user?.username || 'Unknown',
            isVerified: d.created_by_user?.role === 'verified' || d.created_by_user?.role === 'business',
            posterRole: d.created_by_user?.role,
            posterReputation: d.created_by_user?.reputation,
            votes: { up: d.votes_up || 0, down: d.votes_down || 0 },
            comments: d.comment_count || 0,
            location: d.city,
            distance: 'N/A',
            image: d.images?.[0] || 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400',
            isPinned: false,
          }));
          setDeals(mappedData);
          setFilteredDeals(mappedData);
        } else {
          const sample = getSampleDeals();
          setDeals(sample);
          setFilteredDeals(sample);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading deals:', error);
      if (!aliveRef.current) return;
      Alert.alert(
        'Connection Error',
        'Unable to load deals. Please check your internet connection.',
        [
          { text: 'Retry', onPress: () => loadDeals() },
          { text: 'Use Demo Data', onPress: () => {
            const s = getSampleDeals();
            setDeals(s);
            setFilteredDeals(s);
          } },
        ]
      );
      const s = getSampleDeals();
      setDeals(s);
      setFilteredDeals(s);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id,
    sortBy,
    selectedCategories,
    selectedStores,
    minPrice,
    maxPrice,
    minDiscount,
    selectedTags,
    searchQuery,
    locationEnabled,
    selectedRadius,
    expiringSoon,
    userLocation,
  ]);

  // initial + whenever filters change
  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Re-trigger if user returns to the tab/app and a loader is stuck
  useEffect(() => {
    if (Platform.OS === 'web') {
      const onVis = () => {
        if (!document.hidden) {
          if (dataLoading) loadFilterData();
          if (loading) loadDeals();
        }
      };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('focus', onVis);
      return () => {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('focus', onVis);
      };
    } else {
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') {
          if (dataLoading) loadFilterData();
          if (loading) loadDeals();
        }
      });
      return () => sub.remove();
    }
  }, [dataLoading, loading, loadDeals, loadFilterData]);

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

      {showFilters && (
        <View style={styles.filterSection}>
          <View style={styles.sortContainer}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sortOptions}>
                {[
                  { id: 'newest', name: 'Newest', icon: '🕐' },
                  { id: 'popular', name: 'Popular', icon: '🔥' },
                  { id: 'price_low', name: 'Price Low', icon: '⬇️' },
                  { id: 'price_high', name: 'Price High', icon: '⬆️' },
                ].map(sort => (
                  <TouchableOpacity
                    key={sort.id}
                    style={styles.sortOptionWrapper}
                    onPress={() => setSortBy(sort.id as any)}
                  >
                    {sortBy === sort.id ? (
                      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.sortOption}>
                        <Text style={styles.sortEmoji}>{sort.icon}</Text>
                        <Text style={styles.sortOptionTextActive}>{sort.name}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.sortOptionInactive}>
                        <Text style={styles.sortEmojiInactive}>{sort.icon}</Text>
                        <Text style={styles.sortOptionText}>{sort.name}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.advancedFilters}>
            <Text style={styles.filterLabel}>Price Range:</Text>
            <View style={styles.priceInputs}>
              <View style={styles.inputWithIcon}>
                <DollarSign size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Min Price"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={styles.priceSeparator}>-</Text>
              <View style={styles.inputWithIcon}>
                <DollarSign size={16} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Max Price"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Text style={styles.filterLabel}>Minimum Discount:</Text>
            <View style={styles.inputWithIcon}>
              <Percent size={16} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., 20%"
                keyboardType="numeric"
                value={minDiscount}
                onChangeText={setMinDiscount}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Text style={styles.filterLabel}>Tags:</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., electronics, clearance, bogo"
                value={selectedTags}
                onChangeText={setSelectedTags}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Text style={styles.filterLabel}>Categories:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeFilterScroll}>
              <View style={styles.storeOptions}>
                {availableCategories.map(cat => {
                  const active = selectedCategories.includes(cat.id as any);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.storeOptionWrapper}
                      onPress={() => toggleCategory(cat.id as any)}
                    >
                      {active ? (
                        <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.storeOption}>
                          <Text style={styles.storeOptionTextActive}>
                            {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.storeOptionInactive}>
                          <Text style={styles.storeOptionText}>
                            {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.filterLabel}>Store:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeFilterScroll}>
              <View style={styles.storeOptions}>
                {availableStores.map(store => {
                  const active = selectedStores.includes(store.id as any);
                  return (
                    <TouchableOpacity
                      key={store.id}
                      style={styles.storeOptionWrapper}
                      onPress={() => toggleStore(store.id as any)}
                    >
                      {active ? (
                        <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.storeOption}>
                          <Text style={styles.storeOptionTextActive}>{store.name}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.storeOptionInactive}>
                          <Text style={styles.storeOptionText}>{store.name}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.filterItemWithSwitch}>
              <Text style={styles.filterLabel}>Expiring Soon</Text>
              <Switch
                value={expiringSoon}
                onValueChange={setExpiringSoon}
                trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                thumbColor={expiringSoon ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {locationEnabled && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.filterLabel}>Search Radius:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeFilterScroll}>
                  <View style={styles.storeOptions}>
                    {RADIUS_OPTIONS.map(mi => {
                      const active = selectedRadius === mi;
                      return (
                        <TouchableOpacity
                          key={mi}
                          onPress={() => setSelectedRadius(r => (r === mi ? null : mi))}
                          style={styles.storeOptionWrapper}
                        >
                          {active ? (
                            <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.storeOption}>
                              <Text style={styles.storeOptionTextActive}>{mi} mi</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.storeOptionInactive}>
                              <Text style={styles.storeOptionText}>{mi} mi</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
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
        <View style={styles.statsHeader}>
          <View style={styles.statsItem}>
            <TrendingUp size={16} color="#10b981" />
            <Text style={styles.statsText}>{filteredDeals.length} active deals</Text>
          </View>
          <View style={styles.statsItem}>
            <Zap size={16} color="#f59e0b" />
            <Text style={styles.statsText}>{filteredDeals.filter(d => d.isPinned).length} hot deals</Text>
          </View>
          <TouchableOpacity style={styles.statsItem} onPress={() => router.push('/updeals')}>
            <Text style={styles.trendingLink}>View Trending →</Text>
          </TouchableOpacity>
        </View>

        {locationEnabled && (
          <View style={styles.locationBanner}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.locationBannerGradient}>
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.locationBannerText}>
                Showing deals near {userLocation?.city || 'your area'}
              </Text>
            </LinearGradient>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading deals...</Text>
          </View>
        ) : (
          <>
            {filteredDeals.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                isGuest={isGuest}
                onVote={handleVote}
                userRole={currentUserRole}
              />
            ))}

            {filteredDeals.length === 0 && (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateEmoji}>🔍</Text>
                  <Text style={styles.emptyStateText}>No deals found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {searchQuery ? `No results for "${searchQuery}"` : 'Try adjusting your filters to discover amazing deals'}
                  </Text>
                  {searchQuery && (
                    <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
                      <Text style={styles.clearSearchText}>Clear Search</Text>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </View>
            )}
          </>
        )}

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
  bottomPadding: { height: 100 },
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
