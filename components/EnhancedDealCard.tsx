import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Image } from 'react-native';
import { Heart, Share2, Bookmark, Clock, TrendingUp, Star, MapPin, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeProvider';
import { useCurrency } from '@/contexts/CurrencyProvider';
import { formatTimeAgo } from '@/utils/time';
import { router } from 'expo-router';

interface Deal {
  id: string;
  title: string;
  price: number;
  original_price?: number;
  images?: string[];
  city?: string;
  created_at: string;
  votes_up?: number;
  view_count?: number;
  save_count?: number;
  isPinned?: boolean;
  expiry_date?: string;
}

interface EnhancedDealCardProps {
  deal: Deal;
  isGuest: boolean;
  onVote: (dealId: number, voteType: 'up' | 'down') => void;
  userRole?: string;
  userId?: string;
}

export function EnhancedDealCard({ deal, isGuest, onVote, userRole, userId }: EnhancedDealCardProps) {
  const { colors } = useTheme();
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleSave = async () => {
    if (isGuest || !userId) {
      Alert.alert('Sign In Required', 'Please sign in to save deals');
      return;
    }
    setIsSaved(true);
    Alert.alert('Saved!', 'Deal added to your saved collection');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing deal: ${deal.title} for ${deal.price}`,
        url: `https://spicybeats.com/deal/${deal.id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLike = async () => {
    if (isGuest || !userId) {
      Alert.alert('Sign In Required', 'Please sign in to like deals');
      return;
    }

    setIsLiked(!isLiked);
  };

  const getTimeRemaining = () => {
    if (!deal.expiry_date) return null;
    
    const now = new Date();
    const expiry = new Date(deal.expiry_date);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
  };

  const timeRemaining = getTimeRemaining();
  const isExpiringSoon = timeRemaining && timeRemaining.includes('h') && parseInt(timeRemaining) < 24;

  const getStatusPill = () => {
    const netVotes = deal.votes_up || 0;
    const views = deal.view_count || 0;
    
    // Priority order: Expiring > Hot > Trending > Promoted
    if (isExpiringSoon) {
      return (
        <View style={[styles.statusPill, styles.expiringPill]}>
          <Clock size={12} color="#FFFFFF" />
          <Text style={styles.pillText}>Expiring Soon</Text>
        </View>
      );
    }
    
    if (netVotes >= 10 && views >= 50) {
      return (
        <View style={[styles.statusPill, styles.hotPill]}>
          <TrendingUp size={12} color="#FFFFFF" />
          <Text style={styles.pillText}>Hot Deal</Text>
        </View>
      );
    }
    
    if (netVotes >= 5 || views >= 25) {
      return (
        <View style={[styles.statusPill, styles.trendingPill]}>
          <Star size={12} color="#FFFFFF" />
          <Text style={styles.pillText}>Trending</Text>
        </View>
      );
    }
    
    if (deal.isPinned) {
      return (
        <View style={[styles.statusPill, styles.promotedPill]}>
          <Text style={styles.pillText}>Promoted</Text>
        </View>
      );
    }
    
    return null;
  };

  const { formatPrice } = useCurrency();
  const discountPercentage = deal.original_price && deal.price 
    ? Math.round((1 - deal.price / deal.original_price) * 100) 
    : 0;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`)}
      activeOpacity={0.95}
    >
      {/* Hero Image with Overlay */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: deal.images?.[0] || 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image' }}
          style={styles.image}
        />
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.7)']} 
          style={styles.imageOverlay}
        />
        
        {/* Floating badges */}
        <View style={styles.badgeContainer}>
          {discountPercentage > 0 ? (
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
            </LinearGradient>
          ) : null}
          {deal.isPinned ? (
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.badge}>
              <TrendingUp size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>HOT</Text>
            </LinearGradient>
          ) : null}
        </View>

        {/* Price overlay */}
        <View style={styles.priceOverlay}>
          <Text style={styles.currentPrice}>{formatPrice(deal.price)}</Text>
          {deal.original_price ? (
            <Text style={styles.originalPrice}>{formatPrice(deal.original_price)}</Text>
          ) : null}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {deal.title}
        </Text>
        
        <View style={styles.metaRow}>
          <View style={styles.locationContainer}>
            <MapPin size={14} color="#6366f1" />
            <Text style={[styles.location, { color: colors.textSecondary }]}>
              {deal.city || 'Online'}
            </Text>
          </View>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
            {formatTimeAgo(deal.created_at)}
          </Text>
        </View>

        {/* Stats and Status row */}
        <View style={styles.statsRow}>
          <View style={styles.leftStats}>
            <View style={styles.stat}>
              <Eye size={14} color="#6366f1" />
              <Text style={styles.statText}>{deal.view_count || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Heart size={14} color="#ef4444" />
              <Text style={styles.statText}>{deal.votes_up || 0}</Text>
            </View>
          </View>
          
          {getStatusPill() || null}
        </View>
      </View>

      {/* Get Deal Button */}
      <View style={[styles.actionContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.getDealButton}
          onPress={(e) => { e.stopPropagation(); router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`); }}
        >
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.getDealGradient}>
            <Text style={styles.getDealText}>View Deal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
  },
  discountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  originalPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    textDecorationLine: 'line-through',
    opacity: 0.8,
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  timeAgo: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hotPill: {
    backgroundColor: '#ef4444',
  },
  trendingPill: {
    backgroundColor: '#f59e0b',
  },
  expiringPill: {
    backgroundColor: '#dc2626',
  },
  promotedPill: {
    backgroundColor: '#6366f1',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  getDealButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  getDealGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getDealText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});