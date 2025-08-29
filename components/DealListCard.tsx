import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Share2, Bookmark, Clock, TrendingUp, Star, MapPin, Eye, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react-native';

import { UserRole } from '@/types/user';

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
  const votesUp = deal.votes_up || 0;
  const votesDown = deal.votes_down || 0;
  const netVotes = votesUp - votesDown;
  const userVote = deal.user_vote;

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isGuest) return;
    await onVote(Number(deal.id), voteType);
  };

  const discountPercentage = deal.original_price && deal.original_price > 0 ? 
    Math.round(((deal.original_price - deal.price) / deal.original_price) * 100) : 0;

  const isExpiring = deal.expires_at && 
    new Date(deal.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const isTrending = (() => {
    const hoursAgo = (Date.now() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60);
    return hoursAgo <= 24 && votesUp > 5;
  })();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#fafbfc']}
        style={styles.gradient}
      >
        <TouchableOpacity style={styles.content} activeOpacity={0.98}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            {deal.images && deal.images.length > 0 ? (
              <Image source={{ uri: deal.images[0] }} style={styles.dealImage} />
            ) : (
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.placeholderImage}
              >
                <Text style={styles.placeholderEmoji}>🎯</Text>
              </LinearGradient>
            )}
            
            {/* Overlay badges */}
            <View style={styles.imageBadges}>
              {isTrending && (
                <View style={styles.trendingBadge}>
                  <TrendingUp size={12} color="#ffffff" />
                  <Text style={styles.badgeText}>HOT</Text>
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
                  <Text style={styles.currentPrice}>${deal.price.toFixed(2)}</Text>
                  {deal.original_price && deal.original_price > deal.price && (
                    <Text style={styles.originalPrice}>${deal.original_price.toFixed(2)}</Text>
                  )}
                </View>
                {discountPercentage > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-{discountPercentage}%</Text>
                  </View>
                )}
                
                {/* Engagement stats */}
                <View style={styles.engagementStats}>
                  <View style={styles.statItem}>
                    <Eye size={14} color="#94a3b8" />
                    <Text style={styles.statText}>{deal.views_count || 0}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MessageCircle size={14} color="#94a3b8" />
                    <Text style={styles.statText}>{deal.comments_count || 0}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Section */}
            <View style={styles.actionSection}>
              {/* Vote controls */}
              <View style={styles.voteControls}>
                <TouchableOpacity
                  style={[styles.voteButton, userVote === 'up' && styles.voteButtonUp]}
                  onPress={() => handleVote('up')}
                  disabled={isGuest}
                >
                  <ChevronUp 
                    size={18} 
                    color={userVote === 'up' ? '#ffffff' : '#64748b'} 
                  />
                </TouchableOpacity>
                
                <Text style={[styles.voteCount, netVotes > 0 && styles.positiveVotes]}>
                  {netVotes > 0 ? `+${netVotes}` : netVotes}
                </Text>
                
                <TouchableOpacity
                  style={[styles.voteButton, userVote === 'down' && styles.voteButtonDown]}
                  onPress={() => handleVote('down')}
                  disabled={isGuest}
                >
                  <ChevronDown 
                    size={18} 
                    color={userVote === 'down' ? '#ffffff' : '#64748b'} 
                  />
                </TouchableOpacity>
              </View>

              {/* Action buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Heart size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Bookmark size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Share2 size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* User info */}
              {deal.user && (
                <View style={styles.userInfo}>
                  <Text style={styles.username}>@{deal.user.username}</Text>
                  <Text style={styles.userRole}>{deal.user.role}</Text>
                </View>
              )}
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
});
