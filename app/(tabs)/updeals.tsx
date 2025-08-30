// app/(tabs)/updeals.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthProvider';
import { dealService, DealWithRelations } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

export default function UpDealsScreen() {
  const { user } = useAuth();
  const isGuest = !user;

  const [selectedCategory, setSelectedCategory] = useState('all');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [showFilters, setShowFilters] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingDeals, setTrendingDeals] = useState<DealWithRelations[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, categoriesRes] = await Promise.all([
        dealService.getDeals({ sortBy: 'popular', limit: 20 }),
        categoryService.getCategories()
      ]);

      if (dealsRes[1]) {
        const mappedDeals = (dealsRes[1] as DealWithRelations[]).map((d: any) => ({
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
        setTrendingDeals(mappedDeals);
      }

      if (categoriesRes.data) {
        setCategories([{ id: 'all' as any, name: 'All', emoji: '🔥', slug: 'all', is_active: true, deal_count: 0, created_at: '', updated_at: '' }, ...categoriesRes.data]);
      }
    } catch (error) {
      console.error("Failed to load trending deals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleVote = (dealId: string, voteType: 'up' | 'down') => {
    if (isGuest) {
      Alert.alert(
        "Join SpicyBeats",
        "Sign in to vote on trending deals!",
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

  const handleLocationToggle = () => {
    setLocationEnabled(!locationEnabled);
    Alert.alert(
      locationEnabled ? "Location Disabled" : "Location Enabled",
      locationEnabled ? "Location services turned off" : "Now showing deals near you!"
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onPostPress={() => router.push('/post')} onAlertsPress={() => router.push('/alerts')} />

      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#f59e0b', '#d97706']}
          style={styles.headerGradient}
        >
          <View style={styles.titleContainer}>
            <TrendingUp size={24} color="#FFFFFF" />
            <Text style={styles.pageTitle}>Trending UpDeals</Text>
          </View>
          <Text style={styles.subtitle}>
            Most popular deals right now
          </Text>
        </LinearGradient>
      </View>


      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <ScrollView style={styles.dealsContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} size="large" color="#f59e0b" />
        ) : (
          <>
            {false ? ( // Temporarily disable grid view to fix syntax error
              <View style={styles.dealsGrid}>
                {trendingDeals.map(deal => (
                  <View key={deal.id} style={{ width: `${100 / 2}%`, padding: 8 }}>
                    <Text>Deal placeholder</Text>
                  </View>
                ))}
              </View>
            ) : (
              trendingDeals.map(deal => (
                <Text key={deal.id}>Deal: {deal.title}</Text>
              ))
            )}
          </>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  bottomPadding: {
    height: 100,
  },
});
