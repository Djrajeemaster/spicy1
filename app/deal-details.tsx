import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, Linking, Share, Alert, ImageBackground, Animated, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Store, User, Clock, Share2, ExternalLink, AlertTriangle, ThumbsUp, ThumbsDown, Bookmark, Heart, Eye, TrendingUp, Star, MapPin, Calendar, Tag, Zap, Edit3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { UserRole, getRoleColor } from '@/types/user';
import { reportService } from '@/services/reportService';
import { dealService, DealWithRelations } from '@/services/dealService';
import { savedDealService } from '@/services/savedDealService';
import { handleBackNavigation } from '@/utils/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { useCurrency } from '@/contexts/CurrencyProvider';
import { formatTimeAgo } from '@/utils/time';
import GuestPromptModal from '@/components/GuestPromptModal';
import CommentThread from '@/components/CommentThread';
import DealDetailsSkeleton from '@/components/DealDetailsSkeleton';
import { DealCard } from '@/components/DealCard';
import { canEditAnyDeal } from '@/utils/adminUtils';
import { commentService, CommentNode } from '@/services/commentService';
import { getShareUrl } from '@/utils/config';

export default function DealDetailsScreen() {
  const [guestPromptVisible, setGuestPromptVisible] = useState(false);
  const [guestPromptAction, setGuestPromptAction] = useState<string>('');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [relatedDeals, setRelatedDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteCounts, setVoteCounts] = useState({ up: 0, down: 0 });
  const [isSaved, setIsSaved] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

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
      setSelectedImage(dealData.images?.[0] || null);
      setViewCount(dealData.view_count || 0);
      
      // Check if deal is saved by current user
      if (user?.id) {
        const isSavedStatus = await savedDealService.isDealSaved(id, user.id);
        setIsSaved(isSavedStatus);
      }
      
      // Animate content when loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: Platform.OS !== 'web', // Disable on web
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web', // Disable on web
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web', // Disable on web
        }),
      ]).start();
    }

    const [commentsError, commentsData] = await commentService.getComments(id);
    if (!commentsError) setComments(commentsData || []);
    
    setLoading(false);
  }, [id, user?.id, fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => { loadData(); }, [loadData]);

  // Increment view count once when the detail page is loaded
  useEffect(() => {
    const viewedKey = deal ? `deal_viewed_${deal.id}` : null;
    const already = typeof window !== 'undefined' && viewedKey ? sessionStorage.getItem(viewedKey) : null;
    if (!deal) return;
    if (already) {
      // Already incremented in this session
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [err, data] = await dealService.incrementView(deal.id as string);
        if (cancelled) return;
        if (!err && data && (data as any).view_count !== undefined) {
          setViewCount((data as any).view_count || 0);
          if (typeof window !== 'undefined' && viewedKey) {
            try { sessionStorage.setItem(viewedKey, String(Date.now())); } catch (e) { /* ignore */ }
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [deal]);

  useEffect(() => {
    if (deal?.category_id) {
      (async () => {
        const [error, data] = await dealService.getRelatedDeals(deal.id, deal.category_id);
        if (!error && data) setRelatedDeals(data);
      })();
    }
  }, [deal]);

  const handleBackPress = () => {
    handleBackNavigation();
  };

  const handleVote = useCallback(async (voteType: 'up' | 'down') => {
    if (!user) {
      if (isDesktop) {
        setGuestPromptAction('vote on deals');
        setGuestPromptVisible(true);
      } else {
        Alert.alert('Sign In Required', 'Please sign in to vote on deals');
      }
      return;
    }
    if (!deal) return;
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
    await Share.share({ message: `Check out this deal: ${deal.title}`, url: getShareUrl(`/deal-details?id=${deal.id}`) });
  };

  const handleSave = async () => {
    if (!user) {
      if (isDesktop) {
        setGuestPromptAction('save deals');
        setGuestPromptVisible(true);
      } else {
        Alert.alert('Sign In Required', 'Please sign in to save deals');
      }
      return;
    }
    
    if (!deal) return;
    
    try {
      if (isSaved) {
        // Unsave the deal
        const [error] = await savedDealService.unsaveDeal(deal.id, user.id);
        if (!error) {
          setIsSaved(false);
          Alert.alert('Deal Unsaved', 'Deal removed from your saved list');
        } else {
          console.error('Error unsaving deal:', error);
          Alert.alert('Error', 'Failed to unsave deal. Please try again.');
        }
      } else {
        // Save the deal
        const [error] = await savedDealService.saveDeal(deal.id, user.id);
        if (!error) {
          setIsSaved(true);
          Alert.alert('Deal Saved', 'Deal added to your saved list');
        } else {
          console.error('Error saving deal:', error);
          Alert.alert('Error', 'Failed to save deal. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleEdit = () => {
    if (!deal) return;
    router.push(`/edit-deal/${deal.id}`);
  };

  // Check if user owns this deal
  const isOwnDeal = user && deal && deal.created_by === user.id;
  // Determine if current user can edit (owner OR admin/superadmin)
  const userRoleForCheck = (user && ((user as any).user_metadata?.role || (user as any).role)) || undefined;
  const canEdit = Boolean(user) && (isOwnDeal || canEditAnyDeal(userRoleForCheck));

  // Enhanced status badges
  const getStatusBadges = () => {
    if (!deal) return [];
    
    const badges = [];
    const discount = deal.original_price ? Math.round((1 - deal.price / deal.original_price) * 100) : 0;
    
    if (discount > 50) {
      badges.push(
        <LinearGradient key="hot" colors={['#ef4444', '#dc2626']} style={styles.statusBadge}>
          <Zap size={12} color="#FFFFFF" />
          <Text style={styles.statusBadgeText}>HOT DEAL</Text>
        </LinearGradient>
      );
    }
    
    if (voteCounts.up > 10) {
      badges.push(
        <LinearGradient key="trending" colors={['#f59e0b', '#d97706']} style={styles.statusBadge}>
          <TrendingUp size={12} color="#FFFFFF" />
          <Text style={styles.statusBadgeText}>TRENDING</Text>
        </LinearGradient>
      );
    }
    
    if (viewCount > 100) {
      badges.push(
        <LinearGradient key="popular" colors={['#8b5cf6', '#7c3aed']} style={styles.statusBadge}>
          <Star size={12} color="#FFFFFF" />
          <Text style={styles.statusBadgeText}>POPULAR</Text>
        </LinearGradient>
      );
    }
    
    return badges;
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
    if (!deal?.images || deal.images.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailContainer}>
        {deal.images.map((img, index) => (
          <TouchableOpacity key={index} onPress={() => setSelectedImage(img)}>
            <Image 
              source={{ uri: img }} 
              style={[
                styles.thumbnail, 
                selectedImage === img && styles.thumbnailSelected
              ]}
              onError={() => {
                setImageLoadErrors(prev => new Set([...prev, img]));
              }}
            />
            {imageLoadErrors.has(img) && (
              <View style={styles.thumbnailError}>
                <Text style={styles.thumbnailErrorText}>Failed to load</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const EnhancedActionCard = () => (
    <Animated.View style={[
      styles.enhancedActionCard, 
      isDesktop && styles.desktopActionCard,
      { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
      }
    ]}>
      {isDesktop && (
        <Image 
          source={{ uri: selectedImage || 'https://placehold.co/600x400' }} 
          style={styles.desktopCardImage as any}
          resizeMode="contain"
          onError={() => {
            if (selectedImage) {
              setImageLoadErrors(prev => new Set([...prev, selectedImage]));
              // Try to select the next available image that hasn't failed
              const availableImages = deal?.images?.filter((img: string) => !imageLoadErrors.has(img)) || [];
              if (availableImages.length > 0) {
                setSelectedImage(availableImages[0]);
              } else {
                setSelectedImage(null);
              }
            }
          }}
        />
      )}
      {isDesktop && renderThumbnails()}
      
      {/* Status Badges */}
      <View style={styles.badgeContainer}>
        {getStatusBadges()}
      </View>

  {/* large stats row removed — using compact counters under CTA instead */}

      {/* Enhanced Price Section */}
      <View style={styles.priceSection}>
        <Text style={styles.price}>{formatPrice(deal.price, false)}</Text>
        {deal.original_price && (
          <Text style={styles.originalPrice}>{formatPrice(deal.original_price, false)}</Text>
        )}
        {discount > 0 && (
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </LinearGradient>
        )}
      </View>

      {/* Enhanced CTA Button */}
      <TouchableOpacity 
        style={styles.enhancedCTAButton} 
        onPress={() => deal.deal_url && Linking.openURL(deal.deal_url)}
      >
        <LinearGradient colors={['#10b981', '#059669', '#047857']} style={styles.enhancedCTAGradient}>
          <Zap size={20} color="#FFFFFF" />
          <Text style={styles.enhancedCTAText}>Get This Deal</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Small compact counters under CTA (mobile & web under the CTA) */}
      <View style={styles.smallCountersRow}>
          <View style={[styles.smallCounter, isDesktop ? styles.smallCounterDesktop : styles.smallCounterMobile]}>
            <Heart size={isDesktop ? 16 : 12} color="#ef4444" />
            <Text style={[styles.smallCounterText, isDesktop ? styles.smallCounterTextDesktop : styles.smallCounterTextMobile]}>{voteCounts.up}</Text>
          </View>
          <View style={[styles.smallCounter, isDesktop ? styles.smallCounterDesktop : styles.smallCounterMobile]}>
            <Eye size={isDesktop ? 16 : 12} color="#6366f1" />
            <Text style={[styles.smallCounterText, isDesktop ? styles.smallCounterTextDesktop : styles.smallCounterTextMobile]}>{viewCount}</Text>
          </View>
          <View style={[styles.smallCounter, isDesktop ? styles.smallCounterDesktop : styles.smallCounterMobile]}>
            <TrendingUp size={isDesktop ? 16 : 12} color="#10b981" />
            <Text style={[styles.smallCounterText, isDesktop ? styles.smallCounterTextDesktop : styles.smallCounterTextMobile]}>{discount}%</Text>
          </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionButton, userVote === 'up' && { backgroundColor: '#eef2ff' }]} 
          onPress={() => handleVote('up')}
        >
          <ThumbsUp 
            size={16} 
            color={userVote === 'up' ? '#6366f1' : '#64748b'} 
            fill={userVote === 'up' ? '#6366f1' : 'none'} 
          />
          <Text style={[styles.quickActionText, userVote === 'up' && { color: '#6366f1' }]}>
            {voteCounts.up}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionButton, isSaved && { backgroundColor: '#fef3c7' }]} 
          onPress={handleSave}
        >
          <Bookmark 
            size={16} 
            color={isSaved ? '#f59e0b' : '#64748b'} 
            fill={isSaved ? '#f59e0b' : 'none'}
          />
          <Text style={[styles.quickActionText, isSaved && { color: '#f59e0b' }]}>Save</Text>
        </TouchableOpacity>
        
        {canEdit && (
          <TouchableOpacity style={styles.quickActionButton} onPress={handleEdit}>
            <Text style={[styles.quickActionText, { color: '#3b82f6', fontWeight: '700' }]}>Edit Deal</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.quickActionButton} onPress={handleShare}>
          <Share2 size={16} color="#64748b" />
          <Text style={styles.quickActionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GuestPromptModal
        visible={guestPromptVisible}
        onClose={() => setGuestPromptVisible(false)}
        action={guestPromptAction}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
        {!isDesktop && (
          <ImageBackground source={{ uri: selectedImage || 'https://placehold.co/600x400' }} style={styles.headerImageBackground} imageStyle={styles.headerImage}>
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
                <View style={styles.metaItem}><Clock size={14} color="#64748b" /><Text style={styles.metaText}>{formatTimeAgo(deal.created_at || '')}</Text></View>
                {deal.store && <View style={styles.metaItem}><Store size={14} color="#64748b" /><Text style={styles.metaText}>{deal.store.name}</Text></View>}
              </View>

              {!isDesktop && renderThumbnails()}
              {!isDesktop && <EnhancedActionCard />}

              <View style={styles.descriptionSection}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.descriptionText}>{deal.description}</Text></View>
              <View style={styles.commentsSection}>
                <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
                <CommentThread 
                  dealId={id!} 
                  nodes={comments} 
                  onPosted={loadData} 
                  isGuest={!user}
                  onGuestAction={() => Alert.alert('Sign In Required', 'Please sign in to comment on deals')}
                />
              </View>
            </View>

            {isDesktop && <View style={styles.desktopActionColumn}><EnhancedActionCard /></View>}
          </View>

          {relatedDeals.length > 0 && (
            <View style={[styles.card, styles.relatedSection, isDesktop && { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Related Deals</Text>
              <View style={isDesktop ? styles.dealsGrid : {}}>
                {relatedDeals.map(relatedDeal => (
                  <View key={relatedDeal.id} style={isDesktop ? styles.dealTile : { marginBottom: 16 }}>
                    <DealCard 
                      deal={{
                        id: relatedDeal.id,
                        title: relatedDeal.title,
                        price: relatedDeal.price,
                        original_price: relatedDeal.original_price || undefined,
                        image: relatedDeal.images?.[0] || 'https://placehold.co/400x200',
                        votes: { up: relatedDeal.votes_up || 0, down: relatedDeal.votes_down || 0 },
                        comments: relatedDeal.comment_count || 0,
                        postedBy: relatedDeal.created_by_user?.username || 'Unknown',
                        created_at: relatedDeal.created_at || '',
                        created_by: relatedDeal.created_by,
                        isVerified: relatedDeal.status === 'live',
                        isSample: false
                      }} 
                      isGuest={!user} 
                      userRole={user?.user_metadata?.role}
                      userId={user?.id}
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
  
  headerImageBackground: { height: 320, justifyContent: 'space-between', alignItems: 'center' },
  headerImage: { resizeMode: 'contain' },
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
  desktopActionColumn: { flex: 2, position: 'relative', top: 16 },
  desktopActionCard: { backgroundColor: '#FFFFFF', marginTop: 0 },
  desktopCardImage: { width: '100%', height: 300, borderRadius: 16, backgroundColor: '#e2e8f0', marginBottom: 20 },
  categoryTextDesktop: { fontSize: 14, fontWeight: 'bold', color: '#6366f1', marginBottom: 8, textTransform: 'uppercase' },
  titleDesktop: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, lineHeight: 36 },
  
  // Enhanced UI Styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  enhancedActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  enhancedCTAButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  enhancedCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  enhancedCTAText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  thumbnailError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  thumbnailErrorText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallCountersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
    width: '100%',
  },
  smallCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.03)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    minWidth: 36,
    justifyContent: 'center',
  },
  smallCounterText: {
    marginLeft: 6,
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  smallCounterDesktop: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
  },
  smallCounterTextDesktop: {
    fontSize: 14,
  },
});