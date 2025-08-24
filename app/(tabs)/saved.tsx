// app/(tabs)/saved.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator // Import ActivityIndicator for loading state
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bookmark, Filter, Trash2, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { DealCard } from '@/components/DealCard';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider'; // Import useAuth
import { dealService, DealWithRelations } from '@/services/dealService'; // Import dealService and DealWithRelations
import { formatTimeAgo } from '@/utils/time'; // Import formatTimeAgo

export default function SavedScreen() {
  const { user, profile } = useAuth(); // Get user and profile from AuthProvider
  const isGuest = !user; // Determine guest status based on user object
  const [savedDeals, setSavedDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch saved deals when user changes or component mounts
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const fetchSavedDeals = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          const { data, error } = await dealService.getSavedDeals(user.id);
          if (isMounted) {
            if (error) {
              console.error('Error fetching saved deals:', error);
              Alert.alert('Error', 'Failed to load your saved deals.');
              setSavedDeals([]); // Clear deals on error
            } else if (data) {
              // Map Supabase created_at to createdAt for DealCard compatibility
              const mappedData = data.map(d => ({
                ...d,
                createdAt: d.created_at // Use created_at from Supabase
              }));
              setSavedDeals(mappedData);
            }
          }
        } catch (error) {
          console.error('Unexpected error fetching saved deals:', error);
          if (isMounted) {
            Alert.alert('Connection Error', 'Unable to connect to the server to load saved deals.');
            setSavedDeals([]); // Clear deals on unexpected error
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        // If no user, clear saved deals and stop loading
        if (isMounted) {
          setSavedDeals([]);
          setLoading(false);
        }
      }
    };

    fetchSavedDeals();

    return () => {
      isMounted = false; // Cleanup: set flag to false when component unmounts
    };
  }, [user]); // Re-run effect when user object changes

  // Dynamically generate categories based on fetched deals
  const categories = [
    { id: 'all', name: 'All', count: savedDeals.length },
    ...Array.from(new Set(savedDeals.map(deal => deal.category.name))).map(categoryName => ({
      id: categoryName.toLowerCase().replace(/\s/g, ''), // Create slug from name
      name: categoryName,
      count: savedDeals.filter(deal => deal.category.name === categoryName).length,
    })),
  ];

  const handleAuth = () => {
    if (isGuest) {
      router.push('/sign-in');
    } else {
      // This case should ideally be handled by a logout function in Header or Profile
      // For now, we'll just log out if user is not guest
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", onPress: () => { /* signOut() logic */ } } // Placeholder for actual signOut
        ]
      );
    }
  };

  const handleVote = async (dealId: string, voteType: 'up' | 'down') => {
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

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      const { error } = await dealService.voteDeal(dealId, user.id, voteType);
      if (error) {
        console.error('Error voting:', error);
        Alert.alert('Error', 'Failed to record your vote.');
      } else {
        // Optimistically update UI or re-fetch deals
        // For simplicity, let's re-fetch to ensure consistency
        const { data } = await dealService.getSavedDeals(user.id);
        if (data) {
          const mappedData = data.map(d => ({
            ...d,
            createdAt: d.created_at
          }));
          setSavedDeals(mappedData);
        }
      }
    } catch (error) {
      console.error('Unexpected error during vote:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server.');
    }
  };

  const handleRemoveFromSaved = async (dealId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    Alert.alert(
      "Remove from Saved",
      "Are you sure you want to remove this deal from your saved list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await dealService.saveDeal(dealId, user.id); // saveDeal toggles save status
              if (error) {
                console.error('Error unsaving deal:', error);
                Alert.alert('Error', 'Failed to remove deal from saved list.');
              } else {
                // Update local state immediately
                setSavedDeals(prev => prev.filter(deal => deal.id !== dealId));
                Alert.alert("Removed", "Deal removed from your saved list.");
              }
            } catch (error) {
              console.error('Unexpected error unsaving deal:', error);
              Alert.alert('Connection Error', 'Unable to connect to the server.');
            }
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    if (savedDeals.length === 0) return;

    Alert.alert(
      "Clear All Saved Deals",
      "Are you sure you want to remove all saved deals? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) {
              Alert.alert('Error', 'User not authenticated.');
              return;
            }
            try {
              // Iterate and unsave each deal
              for (const deal of savedDeals) {
                await dealService.saveDeal(deal.id, user.id);
              }
              setSavedDeals([]); // Clear local state
              Alert.alert("Cleared", "All saved deals have been removed.");
            } catch (error) {
              console.error('Error clearing all saved deals:', error);
              Alert.alert('Error', 'Failed to clear all saved deals.');
            }
          }
        }
      ]
    );
  };

  const filteredDeals = selectedCategory === 'all'
    ? savedDeals
    : savedDeals.filter(deal => deal.category.name.toLowerCase().replace(/\s/g, '') === selectedCategory);

  if (isGuest) {
    return (
      <View style={styles.container}>
        <Header
          isGuest={isGuest}
          onAuthPress={handleAuth}
          onPostPress={() => router.push('/post')}
          onAlertsPress={() => router.push('/alerts')}
        />

        <View style={styles.guestContainer}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6', '#d946ef']}
            style={styles.guestGradient}
          >
            <View style={styles.guestContent}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.guestIconContainer}
              >
                <Bookmark size={48} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.guestTitle}>Save Your Favorite Deals</Text>
              <Text style={styles.guestDescription}>
                Sign in to bookmark deals and never miss out on amazing savings!
              </Text>

              <View style={styles.featuresContainer}>
                {[
                  { emoji: '💾', text: 'Save deals for later' },
                  { emoji: '🔔', text: 'Get expiry reminders' },
                  { emoji: '📊', text: 'Track your savings' }
                ].map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.joinButtonWrapper}
                onPress={handleAuth}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.joinButton}
                >
                  <Text style={styles.joinButtonText}>Sign In to Save Deals</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        isGuest={isGuest}
        onAuthPress={handleAuth}
        onPostPress={() => router.push('/post')}
        onAlertsPress={() => router.push('/alerts')}
      />

      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          style={styles.headerGradient}
        >
          <View style={styles.titleContainer}>
            <Bookmark size={24} color="#FFFFFF" />
            <Text style={styles.pageTitle}>Saved Deals</Text>
          </View>
          <View style={styles.headerActions}>
            <Text style={styles.subtitle}>
              {loading ? 'Loading...' : `${savedDeals.length} saved deals`}
            </Text>
            {savedDeals.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
                <Trash2 size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading saved deals...</Text>
        </View>
      ) : (
        <>
          {savedDeals.length > 0 && (
            <View style={styles.categoryFilter}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={styles.categoryWrapper}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      {selectedCategory === category.id ? (
                        <LinearGradient
                          colors={['#6366f1', '#4f46e5']}
                          style={styles.categoryButton}
                        >
                          <Text style={styles.categoryTextActive}>
                            {category.name} ({category.count})
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.categoryButtonInactive}>
                          <Text style={styles.categoryText}>
                            {category.name} ({category.count})
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <ScrollView style={styles.dealsContainer} showsVerticalScrollIndicator={false}>
            {filteredDeals.map(deal => (
              <View key={deal.id} style={styles.savedDealContainer}>
                <DealCard
                  deal={{
                    ...deal,
                    id: parseInt(deal.id), // Ensure ID is number for DealCard
                    price: parseFloat(deal.price.toString()), // Ensure price is number
                    originalPrice: deal.original_price ? parseFloat(deal.original_price.toString()) : undefined,
                    distance: 'N/A', // Placeholder as distance is not in saved_deals directly
                    image: deal.images?.[0] || 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400',
                    votes: { up: deal.votes_up || 0, down: deal.votes_down || 0 },
                    comments: deal.comment_count || 0,
                    isPinned: false, // Not directly available from saved_deals
                    postedBy: deal.created_by_user?.username || 'Unknown',
                    isVerified: (deal.created_by_user?.role === 'verified' || deal.created_by_user?.role === 'business'),
                    createdAt: deal.created_at,
                    posterRole: deal.created_by_user?.role as any,
                    posterReputation: deal.created_by_user?.reputation || 0,
                  }}
                  isGuest={isGuest}
                  onVote={(dealId, voteType) => handleVote(dealId.toString(), voteType)} // Pass string ID
                  userRole={profile?.role}
                />
                <View style={styles.savedDealActions}>
                  <Text style={styles.savedDate}>Saved {formatTimeAgo(deal.created_at)}</Text>
                  <View style={styles.dealActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => Alert.alert("Share", "Sharing deal...")}
                    >
                      <Share2 size={16} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleRemoveFromSaved(deal.id)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {filteredDeals.length === 0 && savedDeals.length > 0 && (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#f8fafc', '#f1f5f9']}
                  style={styles.emptyStateContainer}
                >
                  <Text style={styles.emptyStateEmoji}>🔍</Text>
                  <Text style={styles.emptyStateText}>No deals in this category</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Try selecting a different category to see your saved deals
                  </Text>
                </LinearGradient>
              </View>
            )}

            {savedDeals.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#f8fafc', '#f1f5f9']}
                  style={styles.emptyStateContainer}
                >
                  <Text style={styles.emptyStateEmoji}>📌</Text>
                  <Text style={styles.emptyStateText}>No saved deals yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Start browsing and save deals you're interested in!
                  </Text>
                  <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => router.push('/')}
                  >
                    <Text style={styles.browseButtonText}>Browse Deals</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
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
  guestContainer: {
    flex: 1,
  },
  guestGradient: {
    flex: 1,
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guestIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  guestDescription: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  joinButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  joinButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  categoryFilter: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  categoryWrapper: {
    marginRight: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryButtonInactive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dealsContainer: {
    flex: 1,
  },
  savedDealContainer: {
    marginBottom: 8,
  },
  savedDealActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: -8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  savedDate: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  dealActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
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
  browseButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 100,
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
});
