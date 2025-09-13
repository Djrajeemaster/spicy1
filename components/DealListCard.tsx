import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Share2, Bookmark, Clock, TrendingUp, Star, MapPin, Eye, MessageCircle, ChevronUp, ChevronDown, Edit3 } from 'lucide-react-native';
import { router } from 'expo-router';

import { UserRole } from '@/types/user';
import { canEditAnyDeal } from '@/utils/adminUtils';

// Define Deal interface based on existing structure
interface Deal {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  created_at: string;
  expires_at?: string;
  votes_up?: number;
  votes_down?: number;
  comments_count?: number;
  views_count?: number;
  location?: string;
  is_verified?: boolean;
  user_vote?: 'up' | 'down' | null;
  images?: string[];
  created_by?: string;
  store?: {
    name: string;
  };
  category?: {
    name: string;
    emoji: string;
  };
  user?: {
    username: string;
    role: string;
    reputation: number;
  };
}

interface DealListCardProps {
  deal: Deal;
  isGuest: boolean;
  onVote: (dealId: number, voteType: 'up' | 'down') => Promise<void>;
  userRole: UserRole;
  userId?: string;
}

export default function DealListCard({ deal, isGuest, onVote, userRole, userId }: DealListCardProps) {
  const [hasViewed, setHasViewed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!deal || !deal.id) return;
    const viewedKey = `deal_viewed_${deal.id}`;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const v = sessionStorage.getItem(viewedKey);
        setHasViewed(Boolean(v));
      } else {
        AsyncStorage.getItem(viewedKey).then(v => setHasViewed(Boolean(v))).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, [deal]);
  const votesUp = deal.votes_up || 0;
  const votesDown = deal.votes_down || 0;
  const netVotes = votesUp - votesDown;
  const userVote = deal.user_vote;

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isGuest) return;
    await onVote(Number(deal.id), voteType);
  };

  const discountPercentage = deal.original_price && Number(deal.original_price) > 0 ? 
    Math.round(((Number(deal.original_price) - Number(deal.price)) / Number(deal.original_price)) * 100) : 0;

  const isExpiring = deal.expires_at && 
    new Date(deal.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  // Compute status badges (align thresholds with detail page / enhanced card)
  const badges = (() => {
    const b: string[] = [];
    const views = (deal.views_count as number) || (deal as any).view_count || 0;
    const discount = deal.original_price && Number(deal.original_price) > Number(deal.price) ? 
      Math.max(0, Math.round(((Number(deal.original_price) - Number(deal.price)) / Number(deal.original_price)) * 100)) : 0;
    // NEW: show until user opens the deal and only for first 3 days after creation
    try {
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      const createdAt = new Date(deal.created_at).getTime();
      const ageMs = Date.now() - createdAt;
      if (ageMs <= threeDaysMs && !hasViewed) b.push('NEW');
    } catch (e) {
      // ignore malformed date
    }

    // HOT: large discount
    if (discount > 50) b.push('HOT');
    // TRENDING: many upvotes
    if ((deal.votes_up || 0) > 10) b.push('TRENDING');
    // POPULAR: many views
    if (views > 100) b.push('POPULAR');

    return b;
  })();

  const handleEdit = () => {
    router.push(`/edit-deal/${deal.id}`);
  };

  const handleCardPress = () => {
    router.push(`/deal-details?id=${deal.id}`);
  };

  const isOwnDeal = deal.created_by === userId;
  const canEdit = !isGuest && (isOwnDeal || canEditAnyDeal(userRole));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#fafbfc']}
        style={styles.gradient}
      >
  <TouchableOpacity style={styles.content} activeOpacity={0.98} onPress={handleCardPress}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            {deal.images && deal.images.length > 0 ? (
              <Image source={{ uri: deal.images[0] }} style={styles.dealImage} resizeMode="contain" />
            ) : (
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.placeholderImage}
              >
                <Text style={styles.placeholderEmoji}>🎯</Text>
              </LinearGradient>
            )}
            
            {/* Overlay badges: NEW (top-left), others bottom-left */}
            <View style={styles.imageBadges}>
              {badges.includes('NEW') && (
                <View style={styles.newBadge}>
                  <Text style={styles.badgeText}>NEW</Text>
                </View>
              )}

              <View style={styles.bottomBadgeRow} pointerEvents="none">
                {badges.includes('TRENDING') && (
                  <View style={styles.expiringBadge}>
                    <TrendingUp size={12} color="#ffffff" />
                    <Text style={styles.badgeText}>TRENDING</Text>
                  </View>
                )}
                {badges.includes('POPULAR') && (
                  <View style={styles.popularBadge}>
                    <Eye size={12} color="#ffffff" />
                    <Text style={styles.badgeText}>POPULAR</Text>
                  </View>
                )}
                {isExpiring && (
                  <View style={styles.expiringBadge}>
                    <Clock size={12} color="#ffffff" />
                    <Text style={styles.badgeText}>ENDS SOON</Text>
                  </View>
                )}
              </View>
            </View>
            {/* HOT badge positioned relative to imageSection so it appears at top-right */}
            {badges.includes('HOT') && (
              <View style={[styles.trendingBadge, styles.hotTopRight]}>
                <TrendingUp size={12} color="#ffffff" />
                <Text style={styles.badgeText}>HOT</Text>
              </View>
            )}
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            <View style={styles.mainContent}>
              {/* Title and description */}
              <View style={styles.textContent}>
                <Text style={styles.title} numberOfLines={2}>{deal.title}</Text>
                <Text style={styles.description} numberOfLines={2}>{deal.description}</Text>
                
                {/* Meta information */}
                <View style={styles.metaRow}>
                  {deal.store && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>at</Text>
                      <Text style={styles.storeName}>{deal.store.name}</Text>
                    </View>
                  )}
                  {deal.category && (
                    <View style={styles.metaItem}>
                      <Text style={styles.categoryTag}>
                        {deal.category.emoji} {deal.category.name}
                      </Text>
                    </View>
                  )}
                  {deal.location && (
                    <View style={styles.metaItem}>
                      <MapPin size={12} color="#94a3b8" />
                      <Text style={styles.locationText}>{deal.location}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Price Section */}
              <View style={styles.priceSection}>
                <View style={styles.priceContainer}>
                  <Text style={styles.currentPrice}>${Number(deal.price).toFixed(2)}</Text>
                  {deal.original_price && Number(deal.original_price) > Number(deal.price) && (
                    <Text style={styles.originalPrice}>${Number(deal.original_price).toFixed(2)}</Text>
                  )}
                </View>
                {discountPercentage > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Section */}
            <View style={styles.actionSection}>
              {/* Vote controls removed - counters moved to bottom-right overlay */}

              {/* Action buttons removed here; kept in bottom-right actions to avoid overlap */}

              {/* User info */}
              {deal.user && (
                <View style={styles.userInfo}>
                  <Text style={styles.username}>@{deal.user.username}</Text>
                  <Text style={styles.userRole}>{deal.user.role}</Text>
                </View>
              )}
            </View>
            {/* Bottom-left counters overlay */}
            <View style={styles.bottomLeftCounters} pointerEvents="none">
              <View style={styles.pill}>
                <Eye size={12} color="#94a3b8" />
                <Text style={styles.pillText}>{(deal.views_count ?? (deal as any).view_count) || 0}</Text>
              </View>
              <View style={styles.pill}>
                <MessageCircle size={12} color="#94a3b8" />
                <Text style={styles.pillText}>{deal.comments_count ?? (deal as any).comment_count ?? 0}</Text>
              </View>
              <View style={styles.pill}>
                <Heart size={12} color="#ef4444" />
                <Text style={styles.pillText}>{(deal as any).votes_up || 0}</Text>
              </View>
            </View>
            {/* Bottom-right action icons (interactive) */}
            <View style={styles.bottomRightActions} pointerEvents="box-none">
              {canEdit && (
                <TouchableOpacity style={styles.actionButton} onPress={(e:any) => { e.stopPropagation(); handleEdit(); }}>
                  <Text style={{ fontSize: 12, color: '#6366f1', fontWeight: '700' }}>Edit</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={(e:any) => e.stopPropagation()}>
                <Bookmark size={18} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={(e:any) => e.stopPropagation()}>
                <Share2 size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    padding: 0,
    minHeight: 120,
  },
  imageSection: {
    width: 140,
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
    color: '#ffffff',
  },
  imageBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  hotTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  bottomBadgeRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 5,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  engagementStatsPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226,232,240,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  pillText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  contentSection: {
    flex: 1,
    padding: 16,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  textContent: {
    flex: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  storeName: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  categoryTag: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  priceSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    lineHeight: 26,
  },
  originalPrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  engagementStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  voteControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  voteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  voteButtonUp: {
    backgroundColor: '#059669',
  },
  voteButtonDown: {
    backgroundColor: '#ef4444',
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginHorizontal: 8,
    minWidth: 24,
    textAlign: 'center',
  },
  positiveVotes: {
    color: '#059669',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  username: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  userRole: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  bottomLeftCounters: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  zIndex: 5,
  },
  bottomRightActions: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  zIndex: 20,
  },
});
