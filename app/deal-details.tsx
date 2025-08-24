// app/deal-details.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Share2,
  Bookmark,
  MessageCircle,
  Shield,
  Navigation,
  Phone,
  Send,
  Flag,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatTimeAgo } from '@/utils/time';
import { dealService, DealWithRelations } from '@/services/dealService';
import { useAuth } from '@/contexts/AuthProvider';
import { commentService, CommentNode } from '@/services/commentService';
import CommentThread from '@/components/CommentThread';
import MentionInput from '@/components/MentionInput';
import { reportService, type ReportReason } from '@/services/reportService';
import { DealMeta } from '@/components/DealMeta';

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export default function DealDetailsScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const navigation = useNavigation();
  const dealId = params.id as string;
  const isSampleDealParam = params.isSample === 'true';
  const treatAsSample = isSampleDealParam || !isUuid(dealId); // prevent 22P02 for non-UUID ids

  const [currentDeal, setCurrentDeal] = useState<DealWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votes, setVotes] = useState({ up: 0, down: 0 });

  const [thread, setThread] = useState<CommentNode[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(true);

  const reloadComments = async () => {
    if (treatAsSample) {
      setThread([]);
      return;
    }
    const { data } = await commentService.getThreadForDeal(dealId);
    setThread(data);
  };

  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // --- SAFE BACK HANDLER ---
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prefer React Navigation
      // @ts-expect-error
      if (navigation?.canGoBack?.()) {
        // @ts-expect-error
        navigation.goBack();
      // expo-router fallback
      // @ts-expect-error
      } else if (router?.canGoBack?.()) {
        router.back();
      } else {
        router.replace('/');
      }
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  // --- LOAD DEAL DETAILS ---
  useEffect(() => {
    const fetchDealDetails = async () => {
      if (!dealId) {
        setLoading(false);
        return;
      }

      if (treatAsSample) {
        const sampleDeal: DealWithRelations = {
          id: params.id as string,
          title: (params.title as string) || 'Deal',
          description: (params.description as string) || '',
          price: params.price ? parseFloat(params.price as string) : 0,
          original_price: params.originalPrice ? parseFloat(params.originalPrice as string) : null,
          category_id: 'sample_category_id',
          store_id: 'sample_store_id',
          tags: [],
          deal_url: null,
          coupon_code: null,
          images: [(params.image as string) || ''],
          city: (params.location as string) || 'N/A',
          state: 'N/A',
          country: 'N/A',
          is_online: true,
          start_date: null,
          expiry_date: null,
          status: (params.status as string) || 'live',
          created_by: 'sample_user_id',
          votes_up: parseInt((params.upvotes as string) || '0') || 0,
          votes_down: parseInt((params.downvotes as string) || '0') || 0,
          comment_count: parseInt((params.comments as string) || '0') || 0,
          view_count: 0,
          click_count: 0,
          save_count: 0,
          created_at: (params.createdAt as string) || new Date().toISOString(),
          updated_at: (params.createdAt as string) || new Date().toISOString(),
          store: { id: 'sample_store_id', name: 'Sample Store', slug: 'sample-store', logo_url: null, verified: false },
          category: { id: 'sample_category_id', name: (params.category as string) || 'Sample Category', emoji: '✨' },
          created_by_user: {
            id: 'sample_user_id',
            username: (params.postedBy as string) || 'Sample User',
            role: (params.posterRole as any) || 'user',
            reputation: parseFloat((params.posterReputation as string) || '0') || 0,
          },
          user_vote: null,
          is_saved: false,
        };
        setCurrentDeal(sampleDeal);
        setIsBookmarked(false);
        setUserVote(null);
        setVotes({ up: sampleDeal.votes_up || 0, down: sampleDeal.votes_down || 0 });
        setLoading(false);
        setCommentsLoading(false);
        setThread([]);
      } else {
        setLoading(true);
        try {
          const { data, error } = await dealService.getDealById(dealId, user?.id);
          if (error) {
            console.error('Error fetching deal details:', error);
            Alert.alert('Error', 'Failed to load deal details.');
            setCurrentDeal(null);
          } else if (data) {
            setCurrentDeal(data);
            setIsBookmarked(data.is_saved || false);
            const uv = data.user_vote?.vote_type;
            setUserVote(uv === 'up' || uv === 'down' ? uv : null);
            setVotes({ up: data.votes_up || 0, down: data.votes_down || 0 });
          } else {
            Alert.alert('Not Found', 'Deal not found.');
            setCurrentDeal(null);
          }
        } catch (error) {
          console.error('Unexpected error fetching deal details:', error);
          Alert.alert('Connection Error', 'Unable to connect to the server.');
          setCurrentDeal(null);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDealDetails();
  }, [
    dealId,
    user?.id,
    treatAsSample,
    params.title,
    params.description,
    params.price,
    params.originalPrice,
    params.image,
    params.location,
    params.status,
    params.upvotes,
    params.downvotes,
    params.comments,
    params.createdAt,
    params.category,
    params.postedBy,
    params.posterRole,
    params.posterReputation
  ]);

  // --- LOAD COMMENTS (threaded) ---
  useEffect(() => {
    const fetchComments = async () => {
      if (!dealId || treatAsSample) {
        setCommentsLoading(false);
        setThread([]);
        return;
      }
      setCommentsLoading(true);
      try {
        const { data, error } = await commentService.getThreadForDeal(dealId);
        if (error) {
          console.error('Error fetching comments (thread):', error);
          Alert.alert('Error', 'Failed to load comments.');
        } else if (data) {
          setThread(data);
        }
      } catch (error) {
        console.error('Unexpected error fetching comments:', error);
        Alert.alert('Connection Error', 'Unable to load comments.');
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [dealId, treatAsSample]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (treatAsSample) {
      Alert.alert('Demo Mode', 'Voting is not available for sample deals.');
      return;
    }
    if (!user?.id || !currentDeal) {
      Alert.alert('Sign In Required', 'Please sign in to vote on deals.');
      return;
    }

    try {
      const { error } = await dealService.voteDeal(currentDeal.id, user.id, voteType);
      if (error) {
        console.error('Error voting:', error);
        Alert.alert('Error', 'Failed to record your vote.');
      } else {
        setVotes(prev => {
          const next = { ...prev };
          if (userVote === voteType) {
            next[voteType] -= 1;
            setUserVote(null);
          } else {
            if (userVote) next[userVote] -= 1;
            next[voteType] += 1;
            setUserVote(voteType);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Unexpected error during vote:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server.');
    }
  };

  const handleBookmark = async () => {
    if (treatAsSample) {
      Alert.alert('Demo Mode', 'Saving deals is not available for sample deals.');
      return;
    }
    if (!user?.id || !currentDeal) {
      Alert.alert('Sign In Required', 'Please sign in to save deals.');
      return;
    }

    try {
      const { error } = await dealService.saveDeal(currentDeal.id, user.id);
      if (error) {
        console.error('Error saving/unsaving deal:', error);
        Alert.alert('Error', 'Failed to update saved status.');
      } else {
        setIsBookmarked(prev => !prev);
      }
    } catch (error) {
      console.error('Unexpected error saving/unsaving deal:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server.');
    }
  };

  const handleShare = () => {
    Alert.alert('Share Deal', 'How would you like to share this deal?', [
      { text: 'Copy Link', onPress: () => Alert.alert('Link Copied!', 'Deal link copied to clipboard') },
      { text: 'Share via...', onPress: () => Alert.alert('Share', 'Opening share menu...') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleGetDirections = () => {
    if (!currentDeal?.city) {
      Alert.alert('Location Missing', 'Deal location not available.');
      return;
    }
    Alert.alert('Get Directions', `Open directions to ${currentDeal.city}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Maps', onPress: () => Alert.alert('Directions', 'Opening maps app...') }
    ]);
  };

  const handleCallStore = () => {
    Alert.alert('Call Store', `Call the store for this deal?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Alert.alert('Calling', 'Opening phone app...') }
    ]);
  };

  const handlePostComment = async () => {
    if (treatAsSample) {
      Alert.alert('Demo Mode', 'Commenting is not available for sample deals.');
      return;
    }
    if (!user?.id || !currentDeal) {
      Alert.alert('Sign In Required', 'Please sign in to post comments.');
      return;
    }
    if (!newCommentContent.trim()) {
      Alert.alert('Empty Comment', 'Please enter some text to post a comment.');
      return;
    }
    if (!isUuid(String(currentDeal.id))) {
      Alert.alert('Not allowed', 'Invalid deal id.');
      return;
    }

    setCommentsLoading(true);
    try {
      const { error } = await commentService.addComment(String(currentDeal.id), user.id, newCommentContent.trim());
      if (error) {
        console.error('Error posting comment:', error);
        Alert.alert('Error', 'Failed to post your comment.');
      } else {
        setNewCommentContent('');
        await reloadComments();
        setCurrentDeal(prev => (prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev));
      }
    } catch (error) {
      console.error('Unexpected error posting comment:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const discountPercentage =
    currentDeal?.original_price && currentDeal?.price
      ? Math.round((1 - currentDeal.price / currentDeal.original_price) * 100)
      : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading deal details...</Text>
      </SafeAreaView>
    );
  }

  if (!currentDeal) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Deal not found or an error occurred.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // @ts-expect-error
            if (navigation?.canGoBack?.()) {
              // @ts-expect-error
              navigation.goBack();
            // @ts-expect-error
            } else if (router?.canGoBack?.()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#030849', '#1e40af']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // @ts-expect-error
              if (navigation?.canGoBack?.()) {
                // @ts-expect-error
                navigation.goBack();
              // @ts-expect-error
              } else if (router?.canGoBack?.()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Deal Details</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerAction} onPress={handleShare}>
              <Share2 size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={handleBookmark}>
              <Bookmark size={22} color={isBookmarked ? '#fbbf24' : '#FFFFFF'} fill={isBookmarked ? '#fbbf24' : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => {
                if (!user) {
                  Alert.alert('Sign In Required', 'Sign in to report deals.');
                  return;
                }
                setReportOpen(true);
              }}
            >
              <Flag size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 20}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Deal Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri:
                  currentDeal.images?.[0] ||
                  'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400'
              }}
              style={styles.image}
            />
            {discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
              </View>
            )}
          </View>

          {/* Deal Info */}
          <View style={styles.dealInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {currentDeal.title}
              </Text>
              {currentDeal.created_by_user?.role === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Shield size={16} color="#10b981" />
                </View>
              )}
            </View>

            <Text style={styles.description}>{currentDeal.description}</Text>

            <View style={styles.priceContainer}>
              <Text style={styles.price}>${currentDeal.price.toFixed(2)}</Text>
              {currentDeal.original_price && (
                <Text style={styles.originalPrice}>${currentDeal.original_price.toFixed(2)}</Text>
              )}
            </View>

            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <MapPin size={16} color="#6366f1" />
                <Text style={styles.metaText}>
                  {currentDeal.city}, {currentDeal.state}
                </Text>
              </View>
              {!!(currentDeal as any)?.distance && (
                <View style={styles.metaItem}>
                  <Navigation size={16} color="#10b981" />
                  <Text style={styles.metaText}>{(currentDeal as any).distance} miles</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Clock size={16} color="#94a3b8" />
                <Text style={styles.metaText}>{formatTimeAgo(currentDeal.created_at)}</Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <DealMeta
                author={{
                  id: currentDeal.created_by_user?.id ?? '',
                  username: currentDeal.created_by_user?.username ?? 'Unknown',
                  reputation: currentDeal.created_by_user?.reputation ?? 0,
                }}
                hideFollow={user?.id === currentDeal.created_by_user?.id}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGetDirections}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.primaryButtonGradient}>
                  <Navigation size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Get Directions</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={handleCallStore}>
                <Phone size={20} color="#6366f1" />
                <Text style={styles.secondaryButtonText}>Call Store</Text>
              </TouchableOpacity>
            </View>

            {/* Boxed arrows vote row */}
            <View style={styles.voteRow}>
              <Text style={styles.voteLabel}>How’s this deal?</Text>

              {/* Upvote */}
              <TouchableOpacity
                onPress={() => handleVote('up')}
                style={styles.voteItem}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[styles.voteBox, userVote === 'up' && styles.voteBoxActiveUp]}>
                  <ArrowUp size={24} color={userVote === 'up' ? '#fff' : '#475569'} />
                </View>
                <Text style={[styles.voteCount, userVote === 'up' && styles.voteCountActiveUp]}>
                  {votes.up}
                </Text>
              </TouchableOpacity>

              {/* Downvote */}
              <TouchableOpacity
                onPress={() => handleVote('down')}
                style={styles.voteItem}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={[styles.voteBox, userVote === 'down' && styles.voteBoxActiveDown]}>
                  <ArrowDown size={24} color={userVote === 'down' ? '#fff' : '#475569'} />
                </View>
                <Text style={[styles.voteCount, userVote === 'down' && styles.voteCountActiveDown]}>
                  {votes.down}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <View style={styles.commentsTitle}>
                <MessageCircle size={20} color="#6366f1" />
                <Text style={styles.sectionTitle}>Comments ({currentDeal.comment_count || 0})</Text>
              </View>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 10 }} />
            ) : thread.length > 0 ? (
              <CommentThread dealId={dealId} nodes={thread} onPosted={reloadComments} />
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet. Be the first to share your thoughts!</Text>
              </View>
            )}

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <MentionInput value={newCommentContent} onChange={setNewCommentContent} />
              <TouchableOpacity
                style={styles.postCommentButton}
                onPress={handlePostComment}
                disabled={commentsLoading || !newCommentContent.trim()}
              >
                <Send size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Report Modal */}
      <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Report Deal</Text>
            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 8 }}>Reason</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(['spam', 'expired', 'misleading', 'offensive', 'duplicate', 'other'] as ReportReason[]).map(r => {
                const active = reportReason === r;
                return (
                  <TouchableOpacity key={r} onPress={() => setReportReason(r)} style={{ marginRight: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 16,
                        backgroundColor: active ? '#ef4444' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: active ? '#ef4444' : '#e2e8f0'
                      }}
                    >
                      <Text
                        style={{ color: active ? '#fff' : '#334155', fontWeight: '600', textTransform: 'capitalize' }}
                      >
                        {r}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 8 }}>Description (optional)</Text>
            <TextInput
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Tell us what's wrong"
              placeholderTextColor="#94a3b8"
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                padding: 12,
                minHeight: 80,
                textAlignVertical: 'top'
              }}
              multiline
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setReportOpen(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 14, marginRight: 10 }}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={reportSubmitting}
                onPress={async () => {
                  try {
                    setReportSubmitting(true);
                    if (!currentDeal?.id || !user?.id) {
                      Alert.alert('Error', 'Missing user or deal id.');
                      return;
                    }
                    const { error } = await reportService.createReport({
                      reporter_id: user.id,
                      target_type: 'deal',
                      target_id: String(currentDeal.id),
                      reason: reportReason,
                      description: reportDescription.trim() || null
                    });
                    if (error) throw error;
                    setReportOpen(false);
                    setReportDescription('');
                    setReportReason('spam');
                    Alert.alert('Report submitted', 'Thanks. We’ll review it shortly.');
                  } catch (e) {
                    console.error(e);
                    Alert.alert('Error', 'Could not submit report.');
                  } finally {
                    setReportSubmitting(false);
                  }
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#ef4444' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  backToHomeButton: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  backToHomeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  header: { paddingBottom: 16, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerActions: { flexDirection: 'row' },
  headerAction: { padding: 8, marginLeft: 8 },
  content: { flex: 1 },
  imageContainer: { position: 'relative', height: 250, backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  discountText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  dealInfo: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: '#1e293b', lineHeight: 32 },
  verifiedBadge: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 4, marginLeft: 12 },
  description: { fontSize: 16, color: '#64748b', lineHeight: 24, marginBottom: 16 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  price: { fontSize: 28, fontWeight: '800', color: '#059669', marginRight: 12 },
  originalPrice: { fontSize: 20, color: '#94a3b8', textDecorationLine: 'line-through' },
  metaInfo: { marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaText: { fontSize: 15, color: '#64748b', marginLeft: 8, fontWeight: '500' },

  // Action buttons row with guaranteed spacing
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12, // guaranteed gap
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 8 },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '700', color: '#6366f1', marginLeft: 8 },

  // Boxed arrows vote row
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  voteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 16,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 22,
  },
  voteBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1', // slate-300
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  voteBoxActiveUp: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  voteBoxActiveDown: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voteCount: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#475569', // slate-600
  },
  voteCountActiveUp: { color: '#10b981' },
  voteCountActiveDown: { color: '#ef4444' },

  commentsSection: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 8 },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  commentsTitle: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginLeft: 8 },

  emptyComments: { alignItems: 'center', paddingVertical: 20 },
  emptyCommentsText: { fontSize: 15, color: '#94a3b8', textAlign: 'center' },

  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  commentInput: { flex: 1, fontSize: 15, color: '#1e293b', paddingVertical: 8, maxHeight: 100 },
  postCommentButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  bottomPadding: { height: 100 }
});
