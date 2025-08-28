import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, Linking, Share, Alert, ImageBackground } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Store, User, Clock, Share2, ExternalLink, AlertTriangle, ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { UserRole, getRoleColor } from '@/types/user';
import { reportService, ReportReason } from '@/services/reportService';
import { dealService, DealWithRelations } from '@/services/dealService';
import { useAuth } from '@/contexts/AuthProvider';
import { useCurrency } from '@/contexts/CurrencyProvider';
import { formatTimeAgo } from '@/utils/time';
import CommentThread from '@/components/CommentThread';
import DealDetailsSkeleton from '@/components/DealDetailsSkeleton';
import { DealCard } from '@/components/DealCard';
import { commentService, CommentNode } from '@/services/commentService';

export default function DealDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [relatedDeals, setRelatedDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteCounts, setVoteCounts] = useState({ up: 0, down: 0 });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [dealError, dealData] = await dealService.getDealById(id, user?.id);

    if (dealError || !dealData) {
      setDeal(null);
    } else {
      setDeal(dealData);
      setUserVote(dealData.user_vote || null);
      setVoteCounts({ up: dealData.votes_up || 0, down: dealData.votes_down || 0 });
      setSelectedImage(dealData.images?.[0] || 'https://placehold.co/600x400');
    }

    const [commentsError, commentsData] = await commentService.getComments(id);
    if (!commentsError) setComments(commentsData || []);
    
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (deal?.category_id) {
      (async () => {
        const [error, data] = await dealService.getRelatedDeals(deal.id, deal.category_id);
        if (!error && data) setRelatedDeals(data);
      })();
    }
  }, [deal]);

  const handleBackPress = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleVote = useCallback(async (voteType: 'up' | 'down') => {
    if (!user || !deal) return;
    const originalVote = userVote;
    const newVote = originalVote === voteType ? null : voteType;
    setUserVote(newVote);
    await dealService.voteDeal(deal.id, user.id, voteType);
    loadData(); // Refresh data after vote
  }, [deal, user, userVote, loadData]);

  const handleUserPress = () => {
    if (deal?.created_by_user?.username) {
      router.push(`/users/${deal.created_by_user.username}`);
    }
  };
  const handleShare = async () => {
    if (!deal) return;
    await Share.share({ message: `Check out this deal: ${deal.title}`, url: `https://spicybeats.com/deal-details?id=${deal.id}` });
  };

  if (loading) return <DealDetailsSkeleton />;

  if (!deal) {
    return (
      <View style={styles.centered}>
        <AlertTriangle size={48} color="#ef4444" />
        <Text style={styles.errorText}>Deal Not Found</Text>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}><Text style={styles.backButtonText}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const discount = deal.original_price ? Math.round((1 - deal.price / deal.original_price) * 100) : 0;

  const renderThumbnails = () => {
    if (!deal?.images || deal.images.length <= 1) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainer}>
        {deal.images.map((img, index) => (
          <TouchableOpacity key={index} onPress={() => setSelectedImage(img)}>
            <Image source={{ uri: img }} style={[styles.thumbnail, selectedImage === img && styles.thumbnailSelected]} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const ActionCard = () => (
    <View style={[styles.actionCard, isDesktop && styles.desktopActionCard]}>
      {isDesktop && <Image source={{ uri: selectedImage || 'https://placehold.co/600x400' }} style={styles.desktopCardImage} />}
      {isDesktop && renderThumbnails()}
      <View style={styles.priceSection}>
        <Text style={styles.price}>{formatPrice(deal.price)}</Text>
        {deal.original_price && <Text style={styles.originalPrice}>{formatPrice(deal.original_price)}</Text>}
        {discount > 0 && <View style={styles.discountBadge}><Text style={styles.discountText}>{discount}%</Text></View>}
      </View>
      <TouchableOpacity style={styles.ctaButton} onPress={() => deal.deal_url && Linking.openURL(deal.deal_url)}>
        <LinearGradient colors={['#10b981', '#059669']} style={styles.ctaGradient}>
          <ExternalLink size={20} color="#FFFFFF" />
          <Text style={styles.ctaButtonText}>Get Deal</Text>
        </LinearGradient>
      </TouchableOpacity>
      <View style={styles.secondaryActions}>
        <TouchableOpacity style={styles.voteButton} onPress={() => handleVote('up')}>
          <ThumbsUp size={20} color={userVote === 'up' ? '#6366f1' : '#64748b'} fill={userVote === 'up' ? '#eef2ff' : 'none'} />
          <Text style={[styles.voteCount, userVote === 'up' && styles.voteCountActive]}>{voteCounts.up}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.voteButton} onPress={() => handleVote('down')}>
          <ThumbsDown size={20} color={userVote === 'down' ? '#ef4444' : '#64748b'} />
          <Text style={styles.voteCount}>{voteCounts.down}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}><Bookmark size={20} color="#64748b" /></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleShare}><Share2 size={20} color="#64748b" /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
        {!isDesktop && (
          <ImageBackground source={{ uri: selectedImage || 'https://placehold.co/600x400' }} style={styles.headerImageBackground}>
            <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']} style={styles.headerOverlay}>
              <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backIcon}><ArrowLeft size={24} color="#FFFFFF" /></TouchableOpacity>
              </View>
              <View style={styles.headerContent}>
                {deal.category && <Text style={styles.categoryText}>{deal.category.name}</Text>}
                <Text style={styles.title}>{deal.title}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        )}

        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {isDesktop && (
            <View style={styles.desktopHeader}>
              <TouchableOpacity onPress={handleBackPress} style={styles.desktopBackIcon}>
                <ArrowLeft size={20} color="#475569" />
                <Text style={styles.desktopBackText}>Back to Deals</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.card, isDesktop && styles.desktopCardLayout]}>
            <View style={isDesktop && styles.desktopDetailsColumn}>
              {isDesktop && (
                <>
                  {deal.category && <Text style={styles.categoryTextDesktop}>{deal.category.name}</Text>}
                  <Text style={styles.titleDesktop}>{deal.title}</Text>
                </>
              )}
              <View style={styles.metaGrid}>
                <TouchableOpacity onPress={handleUserPress} style={styles.metaItem}>
                  <User size={14} color="#64748b" />
                  <Text style={styles.metaText}>Posted by </Text>
                  <Text style={[styles.metaHighlight, deal.created_by_user?.role && { color: getRoleColor(deal.created_by_user.role as UserRole) }]}>
                    {deal.created_by_user?.username || 'Unknown'}
                  </Text>
                  {deal.created_by_user?.role && <View style={{ marginLeft: 8 }}><UserBadge role={deal.created_by_user.role as UserRole} size="small" /></View>}
                </TouchableOpacity>
                <View style={styles.metaItem}><Clock size={14} color="#64748b" /><Text style={styles.metaText}>{formatTimeAgo(deal.created_at)}</Text></View>
                {deal.store && <View style={styles.metaItem}><Store size={14} color="#64748b" /><Text style={styles.metaText}>{deal.store.name}</Text></View>}
              </View>

              {!isDesktop && renderThumbnails()}
              {!isDesktop && <ActionCard />}

              <View style={styles.descriptionSection}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.descriptionText}>{deal.description}</Text></View>
              <View style={styles.commentsSection}><Text style={styles.sectionTitle}>Comments ({comments.length})</Text><CommentThread dealId={id!} nodes={comments} onPosted={loadData} /></View>
            </View>

            {isDesktop && <View style={styles.desktopActionColumn}><ActionCard /></View>}
          </View>

          {relatedDeals.length > 0 && (
            <View style={[styles.card, styles.relatedSection, isDesktop && { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Related Deals</Text>
              <View style={isDesktop ? styles.dealsGrid : {}}>
                {relatedDeals.map(relatedDeal => (
                  <View key={relatedDeal.id} style={isDesktop ? styles.dealTile : { marginBottom: 16 }}>
                    <DealCard 
                      deal={{
                        ...relatedDeal,
                        postedBy: relatedDeal.created_by_user?.username || 'Unknown',
                        image: relatedDeal.images?.[0] || 'https://placehold.co/400x200',
                        votes: { up: relatedDeal.votes_up || 0, down: relatedDeal.votes_down || 0 },
                        comments: relatedDeal.comment_count || 0,
                      }} 
                      isGuest={!user} 
                      onVote={() => router.push(`/deal-details?id=${relatedDeal.id}`)} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollView: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 22, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  backButton: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  backButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  
  headerImageBackground: { height: 250, justifyContent: 'space-between' },
  headerOverlay: { flex: 1, justifyContent: 'space-between', padding: 16, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
  header: { flexDirection: 'row' },
  backIcon: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  headerContent: {},
  categoryText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', lineHeight: 36, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },

  mainContent: { padding: 16, marginTop: -60, zIndex: 1, flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 10,
  },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, fontSize: 14, color: '#475569', fontWeight: '500' },
  metaHighlight: { fontWeight: 'bold' },

  actionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbnailContainer: { marginVertical: 16 },
  thumbnail: { width: 64, height: 64, borderRadius: 8, marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
  thumbnailSelected: { borderColor: '#6366f1' },
  priceSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap' },
  price: { fontSize: 32, fontWeight: 'bold', color: '#10b981' },
  originalPrice: { fontSize: 18, color: '#94a3b8', textDecorationLine: 'line-through', marginLeft: 12 },
  discountBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 12, borderWidth: 1, borderColor: '#fee2e2' },
  discountText: { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  
  ctaButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  ctaButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },

  secondaryActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  voteButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  voteCount: { fontSize: 16, fontWeight: 'bold', color: '#64748b' },
  voteCountActive: { color: '#6366f1' },
  iconButton: { padding: 8 },

  descriptionSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  descriptionText: { fontSize: 16, color: '#475569', lineHeight: 26 },
  commentsSection: {},

  relatedSection: { marginTop: 24 },
  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  dealTile: { width: '50%', paddingHorizontal: 8 },

  // Desktop Layout
  mainContentDesktop: {
    marginTop: 0,
    padding: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  desktopBackIcon: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  desktopBackText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#475569' },
  desktopCardLayout: { flexDirection: 'row', flex: 1 },
  desktopDetailsColumn: { flex: 3, paddingRight: 24 },
  desktopActionColumn: { flex: 2, position: 'sticky', top: 16 },
  desktopActionCard: { backgroundColor: '#FFFFFF', marginTop: 0 },
  desktopCardImage: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#e2e8f0', marginBottom: 20 },
  categoryTextDesktop: { fontSize: 14, fontWeight: 'bold', color: '#6366f1', marginBottom: 8, textTransform: 'uppercase' },
  titleDesktop: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, lineHeight: 36 },
});