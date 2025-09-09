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

interface EnhancedDealCardProps {
  deal: Deal;
  isGuest: boolean;
  onVote: (dealId: number, voteType: 'up' | 'down') => void;
  userRole?: string;
  userId?: string;
}

export function EnhancedDealCard({ deal, isGuest, onVote, userRole, userId }: EnhancedDealCardProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Responsive design
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = Platform.OS === 'web' && width >= 768;

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
        url: getShareUrl(`/deal/${deal.id}`),
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

  const handleEdit = () => {
    router.push(`/edit-deal/${deal.id}`);
  };

  const isOwnDeal = deal.created_by === userId;
  const canEdit = !isGuest && (isOwnDeal || canEditAnyDeal(userRole));

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

  // Mobile compact horizontal layout
  if (isMobile) {
    return (
      <TouchableOpacity 
        style={[styles.mobileContainer, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`)}
        activeOpacity={0.95}
      >
        {/* Left: Compact Image */}
        <View style={styles.mobileImageContainer}>
          <Image 
            source={{ uri: deal.images?.[0] || 'https://placehold.co/100x80/e2e8f0/64748b?text=No+Image' }}
            style={styles.mobileImage}
          />
          {discountPercentage > 0 && (
            <View style={styles.mobileDiscountBadge}>
              <Text style={styles.mobileDiscountText}>{discountPercentage}%</Text>
            </View>
          )}
        </View>

        {/* Right: Content */}
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
              {deal.city && (
                <>
                  <MapPin size={12} color="#64748b" style={{ marginLeft: 8 }} />
                  <Text style={styles.mobileLocationText}>{deal.city}</Text>
                </>
              )}
            </View>
            <Text style={styles.mobileTimeAgo}>{formatTimeAgo(deal.created_at)}</Text>
          </View>

          {getStatusPill() && (
            <View style={styles.mobileStatusContainer}>
              {getStatusPill()}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Desktop/Tablet: Enhanced layout with new styling

  return (
    <TouchableOpacity 
      style={[
        isDesktop ? styles.desktopContainer : styles.container, 
        { backgroundColor: colors.surface }
      ]}
      onPress={() => router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`)}
      activeOpacity={0.95}
    >
      {/* Hero Image with Enhanced Overlay */}
      <View style={isDesktop ? styles.desktopImageContainer : styles.imageContainer}>
        <Image 
          source={{ uri: deal.images?.[0] || 'https://placehold.co/400x200/e2e8f0/64748b?text=No+Image' }}
          style={isDesktop ? styles.desktopImage : styles.image}
        />
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']} 
          style={styles.imageOverlay}
        />
        
        {/* Enhanced Floating badges */}
        <View style={isDesktop ? styles.desktopBadgeContainer : styles.badgeContainer}>
          {discountPercentage > 0 ? (
            <LinearGradient 
              colors={['#ef4444', '#dc2626']} 
              style={[styles.discountBadge, isDesktop && styles.desktopDiscountBadge]}
            >
              <Text style={[styles.discountText, isDesktop && styles.desktopDiscountText]}>
                {discountPercentage}% OFF
              </Text>
            </LinearGradient>
          ) : null}
          {getStatusPill() || null}
        </View>

        {/* Enhanced Price overlay */}
        <View style={isDesktop ? styles.desktopPriceOverlay : styles.priceOverlay}>
          <Text style={[styles.currentPrice, isDesktop && styles.desktopCurrentPrice]}>
            {formatPrice(deal.price)}
          </Text>
          {deal.original_price ? (
            <Text style={[styles.originalPrice, isDesktop && styles.desktopOriginalPrice]}>
              {formatPrice(deal.original_price)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Enhanced Content */}
      <View style={[styles.content, isDesktop && styles.desktopContent]}>
        <Text 
          style={[styles.title, { color: colors.text }, isDesktop && styles.desktopTitle]} 
          numberOfLines={2}
        >
          {deal.title}
        </Text>
        
        <View style={[styles.metaRow, isDesktop && styles.desktopMetaRow]}>
          <View style={[styles.locationContainer, isDesktop && styles.desktopLocationContainer]}>
            <MapPin size={isDesktop ? 12 : 14} color="#6366f1" />
            <Text style={[styles.location, { color: colors.textSecondary }, isDesktop && styles.desktopLocation]}>
              {deal.city || 'Online'}
            </Text>
          </View>
          <View style={[styles.timeContainer, isDesktop && styles.desktopTimeContainer]}>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }, isDesktop && styles.desktopTimeAgo]}>
              {formatTimeAgo(deal.created_at)}
            </Text>
          </View>
        </View>

        {/* Enhanced Stats row */}
        <View style={[styles.statsRow, isDesktop && styles.desktopStatsRow]}>
          <View style={styles.leftStats}>
            <View style={[styles.stat, isDesktop && styles.desktopStat]}>
              <Eye size={isDesktop ? 12 : 14} color="#6366f1" />
              <Text style={[styles.statText, isDesktop && styles.desktopStatText]}>
                {deal.view_count || 0}
              </Text>
            </View>
            <View style={[styles.stat, isDesktop && styles.desktopStat]}>
              <Heart size={isDesktop ? 12 : 14} color="#ef4444" />
              <Text style={[styles.statText, isDesktop && styles.desktopStatText]}>
                {deal.votes_up || 0}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Enhanced Get Deal Button */}
      <View style={[styles.actionContainer, { borderTopColor: colors.border }, isDesktop && styles.desktopActionContainer]}>
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
          style={[styles.getDealButton, isDesktop && styles.desktopGetDealButton]}
          onPress={(e) => { 
            e.stopPropagation(); 
            router.push(`/deal-details?id=${deal.id}&title=${encodeURIComponent(deal.title)}&price=${deal.price}`); 
          }}
        >
          <LinearGradient 
            colors={['#6366f1', '#4f46e5']} 
            style={[styles.getDealGradient, isDesktop && styles.desktopGetDealGradient]}
          >
            <Text style={[styles.getDealText, isDesktop && styles.desktopGetDealText]}>
              View Deal
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Enhanced Desktop Container
  desktopContainer: {
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
    transform: [{ scale: 1 }],
    height: 340,
  },
  
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // Enhanced Desktop Image Styles
  desktopImageContainer: {
    height: 160,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  desktopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  // Enhanced Desktop Badge Styles
  desktopBadgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'column',
    gap: 6,
    zIndex: 3,
  },
  
  badgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  
  desktopDiscountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  
  desktopDiscountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
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
  
  // Mobile Compact Styles
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
  
  // Desktop Compact Styles
  compactLocationContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  compactStat: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
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
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  editButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
