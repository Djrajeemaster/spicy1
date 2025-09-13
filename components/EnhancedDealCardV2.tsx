import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Image, useWindowDimensions, Platform, Animated } from 'react-native';
import { Heart, Share2, Bookmark, Clock, TrendingUp, Star, MapPin, Eye, Edit3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeProvider';
import { useCurrency } from '@/contexts/CurrencyProvider';
import { formatTimeAgo } from '@/utils/time';
import { router } from 'expo-router';
import { canEditAnyDeal } from '@/utils/adminUtils';
import { getShareUrl } from '@/utils/config';

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
  created_by?: string;
}

interface EnhancedDealCardV2Props {
  deal: Deal;
  isGuest: boolean;
  onVote: (dealId: number, voteType: 'up' | 'down') => void;
  userRole?: string;
  userId?: string;
}

export function EnhancedDealCardV2({ deal, isGuest, onVote, userRole, userId }: EnhancedDealCardV2Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Responsive design
  const isMobile = width < 768;
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const handleSave = async () => {
    if (isGuest || !userId) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to save deals.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/sign-in') },
        ]
      );
      return;
    }
    setIsSaved(true);
    Alert.alert('Saved!', 'Deal added to your saved collection');
  };

  const handleEdit = () => {
    router.push(`/edit-deal/${deal.id}`);
  };

  const isOwnDeal = deal.created_by === userId;
  const canEdit = !isGuest && (isOwnDeal || canEditAnyDeal(userRole));

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing deal: ${deal.title} for ${deal.price}`,
        url: getShareUrl(`/deal/${deal.id}`),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleLike = async () => {
    if (isGuest || !userId) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to like deals.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/sign-in') },
        ]
      );
      return;
    }
    setIsLiked(!isLiked);
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isGuest || !userId) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to vote on deals.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/sign-in') },
        ]
      );
      return;
    }
    onVote(Number(deal.id), voteType);
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
  const views = (deal.view_count as number) || (deal as any).views_count || 0;
    
    if (isExpiringSoon) {
      return (
        <View style={[styles.statusPill, styles.expiringPill]}>
          <Clock size={10} color="#FFFFFF" />
          <Text style={styles.pillText}>EXPIRING</Text>
        </View>
      );
    }
    
    if (netVotes >= 10 && views >= 50) {
      return (
        <View style={[styles.statusPill, styles.hotPill]}>
          <TrendingUp size={10} color="#FFFFFF" />
          <Text style={styles.pillText}>HOT</Text>
        </View>
      );
    }
    
    if (netVotes >= 5 || views >= 25) {
      return (
        <View style={[styles.statusPill, styles.trendingPill]}>
          <Star size={10} color="#FFFFFF" />
          <Text style={styles.pillText}>TRENDING</Text>
        </View>
      );
    }
    
    if (deal.isPinned) {
      return (
        <View style={[styles.statusPill, styles.promotedPill]}>
          <Text style={styles.pillText}>PROMOTED</Text>
        </View>
      );
    }
    
    return null;
  };

  const { formatPrice } = useCurrency();
  const discountPercentage = deal.original_price && deal.price 
    ? Math.round((1 - deal.price / deal.original_price) * 100) 
    : 0;

  // Mobile compact layout
  if (isMobile) {
    return (
      <TouchableOpacity 
        style={[styles.mobileContainer, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`)}
        activeOpacity={0.95}
      >
        <View style={styles.mobileImageContainer}>
          <Image 
            source={{ uri: deal.images?.[0] || 'https://placehold.co/100x80/e2e8f0/64748b?text=No+Image' }}
            style={styles.mobileImage}
            resizeMode="contain"
          />
          {discountPercentage > 0 && (
            <View style={styles.mobileDiscountBadge}>
              <Text style={styles.mobileDiscountText}>{discountPercentage}%</Text>
            </View>
          )}
        </View>

        <View style={styles.mobileContent}>
          <Text style={styles.mobileTitle} numberOfLines={2}>{deal.title}</Text>
          
          <View style={styles.mobilePriceRow}>
            <Text style={styles.mobileCurrentPrice}>{formatPrice(deal.price)}</Text>
            {deal.original_price && (
              <Text style={styles.mobileOriginalPrice}>{formatPrice(deal.original_price)}</Text>
            )}
          </View>

          <View style={styles.mobileMetaRow}>
            <View style={styles.mobileStats}>
              <Heart size={12} color="#ef4444" />
              <Text style={styles.mobileStatText}>{deal.votes_up || 0}</Text>
              {typeof deal.city === 'string' && deal.city.length > 0 ? (
                <>
                  <MapPin size={12} color="#64748b" style={{ marginLeft: 8 }} />
                  <Text style={styles.mobileLocationText}>{deal.city}</Text>
                </>
              ) : null}
            </View>
            <Text style={styles.mobileTimeAgo}>{formatTimeAgo(deal.created_at)}</Text>
          </View>

          {getStatusPill() && (
            <View style={styles.mobileStatusContainer}>
              {React.isValidElement(getStatusPill()) ? getStatusPill() : <Text>{getStatusPill()}</Text>}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Desktop: Enhanced compact layout
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`)}
      activeOpacity={0.95}
    >
      {/* Enhanced Image Container */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: deal.images?.[0] || 'https://placehold.co/400x160/e2e8f0/64748b?text=No+Image' }}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.imageOverlay} />
        
        {/* Enhanced Badges */}
        <View style={styles.badgeContainer}>
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
            </View>
          )}
          {getStatusPill()}
        </View>

        {/* Enhanced Price Overlay */}
        <View style={styles.priceOverlay}>
          <Text style={styles.currentPrice}>{formatPrice(deal.price)}</Text>
          {deal.original_price && (
            <Text style={styles.originalPrice}>{formatPrice(deal.original_price)}</Text>
          )}
        </View>
      </View>

      {/* Enhanced Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {deal.title}
        </Text>
        
        <View style={styles.metaRow}>
          <View style={styles.locationContainer}>
            <MapPin size={10} color="#6366f1" />
            <Text style={[styles.location, { color: colors.textSecondary }]}>
              {typeof deal.city === 'string' && deal.city.length > 0 ? deal.city : 'Online'}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
              {typeof formatTimeAgo(deal.created_at) === 'string' ? formatTimeAgo(deal.created_at) : ''}
            </Text>
          </View>
        </View>

        {/* Enhanced Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.leftStats}>
            <View style={styles.stat}>
              <Eye size={10} color="#6366f1" />
              <Text style={styles.statText}>{typeof (deal.view_count as number) === 'number' ? deal.view_count : ((deal as any).views_count || 0)}</Text>
            </View>
            <View style={styles.stat}>
              <Heart size={10} color="#ef4444" />
              <Text style={styles.statText}>{typeof deal.votes_up === 'number' ? deal.votes_up : 0}</Text>
            </View>
          </View>
          
          {timeRemaining && (
            <View style={styles.timeRemaining}>
              <Clock size={8} color="#f59e0b" />
              <Text style={styles.timeRemainingText}>{timeRemaining}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Enhanced Action Button */}
      <View style={[styles.actionContainer, { borderTopColor: colors.border }]}>
        {canEdit && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={(e) => { 
              e.stopPropagation(); 
              handleEdit();
            }}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.getDealButton, canEdit && { marginLeft: 8 }]}
          onPress={(e) => { 
            e.stopPropagation(); 
            router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`); 
          }}
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
  // Enhanced Desktop Container
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    height: 320, // Fixed compact height
    transform: [{ scale: 1 }],
    ...Platform.select({
      web: {
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(99, 102, 241, 0.1)',
          borderColor: 'rgba(99, 102, 241, 0.3)',
        }
      }
    })
  },
  
  // Enhanced Image Styles
  imageContainer: {
    height: 140, // Compact height
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  
  // Enhanced Badge Styles
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
    zIndex: 3,
  },
  
  discountBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  
  discountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
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
    fontSize: 8,
    fontWeight: '700',
  },
  
  // Enhanced Price Overlay
  priceOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  currentPrice: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  originalPrice: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    textDecorationLine: 'line-through',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Enhanced Content Styles
  content: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 18,
    height: 36, // Fixed height for consistency
  },
  
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  
  location: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  
  timeContainer: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  
  timeAgo: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
  },
  
  leftStats: {
    flexDirection: 'row',
    gap: 8,
  },
  
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  
  statText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  
  timeRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  
  timeRemainingText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#f59e0b',
  },
  
  // Enhanced Action Button
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  
  getDealButton: {
    flex: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  
  getDealGradient: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  getDealText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Mobile Styles (unchanged)
  mobileContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  mobileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  mobileImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  mobileDiscountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  mobileDiscountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  mobileContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mobileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  mobilePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  mobileCurrentPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
  },
  mobileOriginalPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  mobileMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  mobileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileStatText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 3,
  },
  mobileLocationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 3,
  },
  mobileTimeAgo: {
    fontSize: 10,
    color: '#94a3b8',
  },
  mobileStatusContainer: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
    flex: 1,
    justifyContent: 'center',
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
});
