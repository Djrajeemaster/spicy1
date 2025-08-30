import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Navigation, Filter, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService } from '@/services/dealService';
import { locationService } from '@/services/locationService';

export default function NearbyScreen() {
  const { user, profile } = useAuth();
  const isGuest = !user;
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [radius, setRadius] = useState(5); // miles
  const [nearbyDeals, setNearbyDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);

  const radiusOptions = [1, 2, 5, 10, 25];

  useEffect(() => {
    if (locationEnabled && userLocation) {
      loadNearbyDeals();
    } else {
      setNearbyDeals([]);
    }
  }, [locationEnabled, radius, userLocation]);

  // Refresh nearby deals when screen comes into focus (with simple optimization)
  const lastNearbyLoadRef = useRef(0);
  const NEARBY_RELOAD_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastLoad = now - lastNearbyLoadRef.current;
      
      // Only reload if location is enabled and data is stale
      if (locationEnabled && userLocation && 
          (timeSinceLastLoad > NEARBY_RELOAD_THRESHOLD || nearbyDeals.length === 0)) {
        console.log('� Nearby: Reloading deals on focus');
        loadNearbyDeals();
        lastNearbyLoadRef.current = now;
      } else {
        console.log('📱 Nearby: Skipping reload');
      }
    }, [locationEnabled, userLocation, nearbyDeals.length])
  );

  const loadNearbyDeals = async () => {
    if (!userLocation) return;

    setLoading(true);
    try {
      // Fetch all deals first
      const [error, allDeals] = await dealService.getDeals({ limit: 100 }, user?.id);
      
      if (error) {
        console.error('Error fetching deals:', error);
        Alert.alert('Error', 'Failed to load nearby deals.');
        return;
      }

      // Filter by proximity using location service
      const { data: filteredDeals, error: locationError } = await locationService.filterDealsByProximity(
        (allDeals || []).map(deal => ({
          ...deal,
          id: String(deal.id),
          price: parseFloat(deal.price.toString()),
          originalPrice: deal.original_price ? parseFloat(deal.original_price.toString()) : undefined,
          distance: 'N/A',
          image: deal.images?.[0] || 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400',
          votes: { up: deal.votes_up || 0, down: deal.votes_down || 0 },
          comments: deal.comment_count || 0,
          isPinned: false,
          postedBy: deal.created_by_user?.username || 'Unknown',
          isVerified: deal.created_by_user?.role === 'verified' || deal.created_by_user?.role === 'business',
          createdAt: deal.created_at,
          posterRole: deal.created_by_user?.role,
          posterReputation: deal.created_by_user?.reputation,
        })),
        radius
      );

      if (locationError) {
        Alert.alert('Location Error', locationError);
      }

      setNearbyDeals(filteredDeals);
    } catch (error) {
      console.error('Error loading nearby deals:', error);
      Alert.alert('Error', 'Failed to load nearby deals.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationToggle = () => {
    if (!locationEnabled) {
      Alert.alert(
        "Enable Location",
        "Allow SpicyBeats to access your location to show nearby deals?",
        [
          { text: "Not Now", style: "cancel" },
          { 
            text: "Allow", 
            onPress: async () => {
              setLoading(true);
              const { data: location, error } = await locationService.getCurrentLocation();
              
              if (error) {
                Alert.alert("Location Error", error);
                setLoading(false);
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

  const handleVote = (dealId: any, voteType: any) => {
    if (isGuest) {
      Alert.alert(
        "Join SpicyBeats",
        "Sign in to vote on nearby deals!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Sign In", onPress: () => router.push('/sign-in') }
        ]
      );
      return;
    }

    setNearbyDeals(prevDeals => 
      prevDeals.map(deal => {
        if (deal.id === dealId) {
          const newVotes = { ...deal.votes };
          if (voteType === 'up') {
            newVotes.up += 1;
          } else {
            newVotes.down += 1;
          }
          return { ...deal, votes: newVotes };
        }
        return deal;
      })
    );

    Alert.alert("Vote Recorded!", `Thanks for your ${voteType}vote!`);
  };

  const numColumns = isDesktop ? (width > 1200 ? 4 : width > 900 ? 3 : 2) : 1;

  return (
    <View style={styles.container}>
      <Header 
        // Add other header props as needed, e.g., onPostPress
      />
      
      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.headerGradient}
        >
          <View style={styles.titleContainer}>
            <MapPin size={24} color="#FFFFFF" />
            <Text style={styles.pageTitle}>Nearby Deals</Text>
          </View>
          <Text style={styles.subtitle}>
            {userLocation ? `Deals near ${userLocation.city || 'you'}` : 'Discover amazing deals around you'}
          </Text>
        </LinearGradient>
      </View>

      {!locationEnabled ? (
        <View style={styles.locationPrompt}>
          <LinearGradient
            colors={['#f8fafc', '#f1f5f9']}
            style={styles.promptContainer}
          >
            <View style={styles.promptIcon}>
              <Navigation size={48} color="#6366f1" />
            </View>
            <Text style={styles.promptTitle}>Enable Location</Text>
            <Text style={styles.promptDescription}>
              Allow location access to discover amazing deals near you
            </Text>
            <TouchableOpacity style={styles.enableButton} onPress={handleLocationToggle}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.enableButtonGradient}
              >
                <Text style={styles.enableButtonText}>Enable Location</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <>
         
          <View style={styles.radiusSection}>
            <Text style={styles.radiusLabel}>Search Radius</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.radiusOptions}>
                {radiusOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={styles.radiusOptionWrapper}
                    onPress={() => setRadius(option)}
                  >
                    {radius === option ? (
                      <LinearGradient
                        colors={['#6366f1', '#4f46e5']}
                        style={styles.radiusOption}
                      >
                        <Text style={styles.radiusOptionTextActive}>
                          {option} mi
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.radiusOptionInactive}>
                        <Text style={styles.radiusOptionText}>
                          {option} mi
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.locationBanner}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.locationBannerGradient}
            >
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.locationBannerText}>
                Showing deals within {radius} miles of your location
              </Text>
              <TouchableOpacity onPress={handleLocationToggle}>
                <Text style={styles.disableLocationText}>Disable</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Finding deals near you...</Text>
            </View>
          ) : (
            <ScrollView style={styles.dealsContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.statsHeader}>
                <View style={styles.statsItem}>
                  <Zap size={16} color="#10b981" />
                  <Text style={styles.statsText}>
                    {nearbyDeals.length} deals nearby
                  </Text>
                </View>
                <Text style={styles.sortText}>Sorted by distance</Text>
              </View>

              {numColumns > 1 ? (
                <View style={styles.dealsGrid}>
                  {nearbyDeals.map(deal => (
                    <View key={deal.id} style={{ width: `${100 / numColumns}%`, padding: 8 }}>
                      <DealCard key={deal.id} deal={deal} isGuest={isGuest} onVote={handleVote} userRole={profile?.role} />
                    </View>
                  ))}
                </View>
              ) : (
                nearbyDeals.map(deal => (
                  <DealCard key={deal.id} deal={deal} isGuest={isGuest} onVote={handleVote} userRole={profile?.role} />
                ))
              )}

            {nearbyDeals.length === 0 && locationEnabled && (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#f8fafc', '#f1f5f9']}
                  style={styles.emptyStateContainer}
                >
                  <Text style={styles.emptyStateEmoji}>📍</Text>
                  <Text style={styles.emptyStateText}>No deals found nearby</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try increasing your search radius or check back later for new deals
                  </Text>
                  <TouchableOpacity 
                    style={styles.expandRadiusButton}
                    onPress={() => setRadius(Math.min(radius * 2, 25))}
                  >
                    <Text style={styles.expandRadiusText}>Expand Search Radius</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSection: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  locationPrompt: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  promptContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginHorizontal: 16,
  },
  promptIcon: {
    backgroundColor: '#eef2ff',
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  promptDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  enableButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  enableButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  radiusSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  radiusOptions: {
    flexDirection: 'row',
  },
  radiusOptionWrapper: {
    marginRight: 12,
  },
  radiusOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  radiusOptionInactive: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  radiusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  radiusOptionTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  locationBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  disableLocationText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
  dealsContainer: {
    flex: 1,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  emptyState: {
    padding: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  expandRadiusButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  expandRadiusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  bottomPadding: {
    height: 100,
  },
});