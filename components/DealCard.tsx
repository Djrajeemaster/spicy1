import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Heart, MessageCircle, User, Edit3 } from 'lucide-react-native';
import { formatTimeAgo } from '@/utils/time';
import { useCurrency } from '@/contexts/CurrencyProvider';
import { canEditAnyDeal } from '@/utils/adminUtils';

interface Deal {
  id: string | number;
  title: string;
  price: string | number;
  original_price?: string | number;
  image: string;
  votes: { up: number; down: number };
  votes_up?: number;
  comment_count?: number;
  comments: number;
  postedBy: string;
  created_at: string;
  isVerified?: boolean;
  isSample?: boolean;
  created_by?: string;
}

interface DealCardProps {
  deal: Deal;
  isGuest: boolean;
  onVote: (dealId: string | number, voteType: 'up' | 'down') => void;
  userRole?: string;
  userId?: string;
}

export function DealCard({ deal, onVote, isGuest, userId, userRole }: DealCardProps) {
  const { formatPrice } = useCurrency();

  const handleUserPress = (e: any) => {
    e.stopPropagation(); // Prevent card press from firing
    if (deal.postedBy && deal.postedBy !== 'Unknown') {
      router.push(`/users/${deal.postedBy}`);
    }
  };

  const handleCardPress = () => {
    if (deal.isSample) {
      Alert.alert('Sample Deal', 'This is a sample deal and has no detail page.');
      return;
    }
    router.push(`/deal-details?id=${deal.id}`);
  };

  const handleVotePress = (e: any, voteType: 'up' | 'down') => {
    e.stopPropagation(); // Prevent card press from firing
    if (deal.isSample) {
      Alert.alert('Sample Deal', 'Voting is disabled for sample deals.');
      return;
    }
    onVote(deal.id, voteType);
  };

  const handleEdit = (e: any) => {
    e.stopPropagation();
    router.push(`/edit-deal/${deal.id}`);
  };

  const isOwnDeal = deal.created_by === userId;
  const canEdit = isOwnDeal || canEditAnyDeal(userRole);

  const upVotes = deal.votes?.up ?? deal.votes_up ?? 0;
  const comments = deal.comments ?? deal.comment_count ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.8}>
      <Image source={{ uri: deal.image }} style={styles.image} resizeMode="contain" />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{deal.title}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{typeof deal.price === 'number' ? formatPrice(deal.price) : deal.price}</Text>
          {deal.original_price && (
            <Text style={styles.originalPrice}>{typeof deal.original_price === 'number' ? formatPrice(deal.original_price) : deal.original_price}</Text>
          )}
        </View>

        <View style={styles.metaContainer}>
          <TouchableOpacity style={styles.authorContainer} onPress={handleUserPress}>
            <User size={14} color="#64748b" />
            <Text style={styles.authorText}>{deal.postedBy}</Text>
          </TouchableOpacity>
          <Text style={styles.timeAgo}>{formatTimeAgo(deal.created_at)}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <View style={styles.stats}>
            <TouchableOpacity style={styles.statButton} onPress={(e) => handleVotePress(e, 'up')}>
              <Heart size={18} color="#ef4444" />
              <Text style={styles.statText}>{upVotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statButton} onPress={handleCardPress}>
              <MessageCircle size={18} color="#6366f1" />
              <Text style={styles.statText}>{comments}</Text>
            </TouchableOpacity>
            {(typeof (deal as any).view_count !== 'undefined' || typeof (deal as any).views_count !== 'undefined') && (
              <View style={styles.statButton}>
                <Text style={styles.statText}>
                  {(deal as any).views_count ?? (deal as any).view_count ?? 0}
                </Text>
              </View>
            )}
            {canEdit && !isGuest && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editText}>
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.viewDealButton} onPress={handleCardPress}>
            <Text style={styles.viewDealText}>View Deal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10b981',
  },
  originalPrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  timeAgo: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
  marginLeft: 6,
  fontSize: 13,
  fontWeight: '600',
  color: '#64748b',
  },
  viewDealButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  viewDealText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  editText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
});