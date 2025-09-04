// app/(tabs)/updeals.tsx
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
import { TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { DealCard } from '@/components/DealCard';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService, DealWithRelations } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

export default function UpDealsScreen() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const isGuest = !user;

  const [selectedCategory, setSelectedCategory] = useState('all');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [personalizedDeals, setPersonalizedDeals] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load categories
      const categoriesRes = await categoryService.getCategories();
      if (categoriesRes.data) {
        setCategories([{ id: 'all' as any, name: 'All', emoji: '🔥', slug: 'all', is_active: true, deal_count: 0, created_at: '', updated_at: '' }, ...categoriesRes.data]);
      }

      // Load personalized deals based on saved deals and alerts
      const { apiClient } = await import('@/utils/apiClient');
      
      let personalizedDealsData: any[] = [];
      
      try {
        const savedDeals = await apiClient.get<any[]>(`/deals/saved`, { userId: user!.id });
        personalizedDealsData = savedDeals.map((d: any) => ({
          ...d,
          id: String(d.id),
          price: d.price,
          original_price: d.original_price,
          image: d.images?.[0] || 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg',
          votes: { up: d.votes_up || 0, down: d.votes_down || 0 },
          comments: d.comment_count || 0,
          postedBy: d.created_by_user?.username || 'Unknown',
          created_at: d.created_at,
        }));
      } catch (error) {
        console.error('Error fetching saved deals:', error);
      }

      // If no saved deals, show popular deals as fallback
      if (personalizedDealsData.length === 0) {
        const [dealsRes] = await Promise.all([
          dealService.getDeals({ sortBy: 'popular', limit: 10 })
        ]);
        
        if (dealsRes[1]) {
          personalizedDealsData = (dealsRes[1] as DealWithRelations[]).map((d: any) => ({
            ...d,
            id: String(d.id),
            price: d.price,
            original_price: d.original_price,
            image: d.images?.[0] || 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg',
            votes: { up: d.votes_up || 0, down: d.votes_down || 0 },
            comments: d.comment_count || 0,
            postedBy: d.created_by_user?.username || 'Unknown',
            created_at: d.created_at,
          }));
        }
      }
      
      setPersonalizedDeals(personalizedDealsData);
    } catch (error) {
      console.error("Failed to load personalized deals:", error);
    } finally {
      setLoading(false);
    }
  }, [isGuest, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when screen comes into focus - but only if data is stale
  const lastLoadTimeRef = useRef(0);
  const RELOAD_THRESHOLD = 10 * 60 * 1000; // 10 minutes

  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      
      // Only reload if data is stale or empty
      if (personalizedDeals.length === 0 || timeSinceLastLoad > RELOAD_THRESHOLD) {
        console.log('🔄 For You: Reloading deals on focus');
        loadData();
        lastLoadTimeRef.current = now;
      } else {
        console.log('📱 For You: Skipping reload, data is fresh');
      }
    }, [personalizedDeals.length, loadData, isGuest])
  );

  const handleVote = (dealId: string | number, voteType: 'up' | 'down') => {
    if (isGuest) {
      Alert.alert(
        `Join ${settings?.appName || 'SaversDream'}`,
        "Sign in to vote on recommended deals!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Sign In", onPress: () => router.push('/sign-in') }
        ]
      );
      return;
    }
    // Optimistic update can be added here, but for now, just call the service
    dealService.voteDeal(String(dealId), user!.id, voteType).then(() => loadData());
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onPostPress={() => router.push('/post')} onAlertsPress={() => router.push('/alerts')} />

      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          style={styles.headerGradient}
        >
          <View style={styles.titleContainer}>
            <TrendingUp size={24} color="#FFFFFF" />
            <Text style={styles.pageTitle}>For You</Text>
          </View>
          <Text style={styles.subtitle}>
            Recommended deals based on your alerts and interests
          </Text>
        </LinearGradient>
      </View>


      {isGuest ? (
        <View style={styles.signInPrompt}>
          <View style={styles.promptContainer}>
            <TrendingUp size={64} color="#6366f1" />
            <Text style={styles.promptTitle}>Sign in for personalized deals</Text>
            <Text style={styles.promptDescription}>
              Get deals tailored to your interests based on your alerts and saved deals
            </Text>
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={() => router.push('/sign-in')}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <ScrollView style={styles.dealsContainer} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#6366f1" />
            ) : (
              <>
                {personalizedDeals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <TrendingUp size={48} color="#6366f1" />
                    <Text style={styles.emptyStateTitle}>No personalized deals yet</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Save deals and set up alerts to get personalized recommendations!
                    </Text>
                  </View>
                ) : (
                  personalizedDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      isGuest={isGuest}
                      onVote={handleVote}
                      userRole={user?.role}
                      userId={user?.id}
                    />
                  ))
                )}
              </>
            )}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  dealsContainer: {
    flex: 1,
  },
  dealsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomPadding: {
    height: 100,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  promptContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  promptDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
