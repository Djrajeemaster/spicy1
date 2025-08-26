// app/(tabs)/updeals.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { DealCard } from '@/components/DealCard';
import { router } from 'expo-router';

export default function UpDealsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isGuest, setIsGuest] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'food', name: 'Food & Dining' },
    { id: 'clothing', name: 'Clothing' },
    { id: 'home', name: 'Home & Garden' },
    { id: 'automotive', name: 'Automotive' },
    { id: 'services', name: 'Services' },
  ];

  const handleVote = (dealId, voteType) => {
    if (isGuest) {
      Alert.alert(
        "Join SpicyBeats",
        "Sign in to vote on trending deals!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Sign In", onPress: () => setIsGuest(!isGuest) }
        ]
      );
      return;
    }

    // Update vote count
    setTrendingDeals(prevDeals =>
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

    Alert.alert(
      "Vote Recorded!",
      `Thanks for your ${voteType}vote on this trending deal!`,
      [{ text: "Great!" }]
    );
  };

  const handleAuth = () => {
    setIsGuest(!isGuest);
    Alert.alert(isGuest ? "Logged In" : "Logged Out", isGuest ? "Welcome back!" : "You have been logged out");
  };

  const handleLocationToggle = () => {
    setLocationEnabled(!locationEnabled);
    Alert.alert(
      locationEnabled ? "Location Disabled" : "Location Enabled",
      locationEnabled ? "Location services turned off" : "Now showing deals near you!"
    );
  };

  const [trendingDeals, setTrendingDeals] = useState([
    {
      id: 4,
      title: "Flash Sale: Gaming Laptop 40% Off",
      description: "High-performance gaming laptop with RTX graphics. Limited quantity!",
      price: "$899.99",
      originalPrice: "$1,499.99",
      category: "electronics",
      location: "TechWorld Megastore",
      distance: "3.2 miles",
      image: "https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400",
      votes: { up: 87, down: 3 },
      comments: 24,
      isPinned: true,
      status: 'approved',
      postedBy: "GamerDeals",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Use ISO string
      isVerified: true,
      isSample: true, // Add this flag
    },
    {
      id: 5,
      title: "All-You-Can-Eat Sushi Weekend",
      description: "Premium sushi buffet with fresh ingredients. Weekends only.",
      price: "$29.99",
      category: "food",
      location: "Sakura Sushi House",
      distance: "0.8 miles",
      image: "https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg?auto=compress&cs=tinysrgb&w=400",
      votes: { up: 56, down: 2 },
      comments: 18,
      isPinned: false,
      status: 'approved',
      postedBy: "SushiLover99",
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // Use ISO string
      isVerified: false,
      isSample: true, // Add this flag
    }
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        isGuest={isGuest}
        onAuthPress={handleAuth}
        onPostPress={() => router.push('/post')}
        onAlertsPress={() => router.push('/alerts')}
        showSearch={true}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLocationToggle={handleLocationToggle}
        locationEnabled={locationEnabled}
        showFilters={showFilters}
        onFiltersToggle={() => setShowFilters(!showFilters)}
      />

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
        {trendingDeals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            isGuest={isGuest}
            onVote={handleVote}
          />
        ))}
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
  bottomPadding: {
    height: 100,
  },
});
