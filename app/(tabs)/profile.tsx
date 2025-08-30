// app/(tabs)/profile.tsx
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { followService } from '@/services/followService';
import { dealService, type DealWithRelations } from '@/services/dealService';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User as UserIcon,
  Shield,
  Calendar,
  MessageCircle,
  ThumbsUp,
  Settings,
  LogOut,
  Eye,
  Clock,
  CircleCheck as CheckCircle,
  Circle as XCircle,

  Search,
  Crown,
  Zap,
  Award,
  ArrowLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthProvider';
import { activityService, UserActivity } from '@/services/activityService';
import {  type FollowCounts } from '@/services/followService';
import { formatTimeAgo } from '@/utils/time';
import { DealCard } from '@/components/DealCard';
import { Header } from '@/components/Header';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  
  // New: local tab state (Overview | Following | Saved)
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (params?.tab as string) || 'overview';
  const [profileTab, setProfileTab] = useState<'overview'|'following'|'saved'>(
    initialTab === 'following' ? 'following' : initialTab === 'saved' ? 'saved' : 'overview'
  );

  // Data for Following & Saved
  const [followingFeed, setFollowingFeed] = useState<DealWithRelations[]>([] as any);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const [savedDeals, setSavedDeals] = useState<DealWithRelations[]>([] as any);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    if (profileTab === 'following') {
      (async () => {
        try {
          setLoadingFollowing(true);
          const [error, data] = await followService.getFollowingFeed(30, 0);
          if (error) {
            console.error('Error fetching following feed:', error);
          } else if (data) {
            setFollowingFeed((data as any) as DealWithRelations[]);
          }
        } catch (error) {
          console.error('Error in following feed:', error);
        } finally {
          setLoadingFollowing(false);
        }
      })();
    } else if (profileTab === 'saved' && user) {
      (async () => {
        try {
          setLoadingSaved(true);
          const [error, data] = await dealService.getSavedDeals(user.id);
          if (error) {
            console.error('Error fetching saved deals:', error);
          } else if (data) {
            setSavedDeals(data as DealWithRelations[]);
          }
        } catch (error) {
          console.error('Error in saved deals:', error);
        } finally {
          setLoadingSaved(false);
        }
      })();
    }
  }, [profileTab, user]);

  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [fetchedUserDeals, setFetchedUserDeals] = useState<DealWithRelations[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [fetchedActivities, setFetchedActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);

  // Sign-out dialog state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const totalPosts = profile?.total_posts || 0;
  const liveDealsCount = fetchedUserDeals.filter(d => d.status === 'live').length;
  const totalVotes = fetchedUserDeals.reduce(
    (sum, d) => sum + (d.votes_up || 0) + (d.votes_down || 0),
    0
  );
  const approvalRate = totalPosts > 0 ? Math.round((liveDealsCount / totalPosts) * 100) : 0;

  const getUserLevel = (reputation: number): string => {
    if (reputation >= 4.5) return 'Master Contributor';
    if (reputation >= 4.0) return 'Gold Contributor';
    if (reputation >= 3.0) return 'Silver Contributor';
    if (reputation >= 2.0) return 'Bronze Contributor';
    return 'Newbie';
  };

  const userStats = {
    totalPosts,
    approvalRate,
    totalVotes,
    memberSince: profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : 'N/A',
    reputation: profile?.reputation || 0,
    level: getUserLevel(profile?.reputation || 0),
  };

  useEffect(() => {
  (async () => {
    if (user?.id) {
      const [error, data] = await followService.getCounts(user.id);
      if (data) setFollowCounts(data);
    }
  })();
}, [user?.id]);
useEffect(() => {
    if (user?.id) {
      const loadUserDeals = async () => {
        setLoadingDeals(true);
        const [error, data] = await dealService.getUserDeals(user.id);
        if (error) {
          console.error('Error fetching user deals:', error);
          Alert.alert('Error', 'Failed to load your deals.');
        } else if (data) {
          setFetchedUserDeals(data);
        }
        setLoadingDeals(false);
      };
      loadUserDeals();
    } else {
      setFetchedUserDeals([]);
      setLoadingDeals(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      const loadUserActivities = async () => {
        setLoadingActivities(true);
        const { data, error } = await activityService.getUserActivities(user.id);
        if (error) {
          console.error('Error fetching user activities:', error);
        } else if (data) {
          setFetchedActivities(data);
        }
        setLoadingActivities(false);
      };
      loadUserActivities();
    } else {
      setFetchedActivities([]);
      setLoadingActivities(false);
    }
  }, [user?.id]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // Reload follow counts
        (async () => {
          const [error, data] = await followService.getCounts(user.id);
          if (data) setFollowCounts(data);
        })();

        // Reload user deals
        (async () => {
          setLoadingDeals(true);
          const [error, data] = await dealService.getUserDeals(user.id);
          if (error) {
            console.error('Error fetching user deals:', error);
          } else if (data) {
            setFetchedUserDeals(data);
          }
          setLoadingDeals(false);
        })();

        // Reload user activities
        (async () => {
          setLoadingActivities(true);
          const { data, error } = await activityService.getUserActivities(user.id);
          if (error) {
            console.error('Error fetching user activities:', error);
          } else if (data) {
            setFetchedActivities(data);
          }
          setLoadingActivities(false);
        })();

        // Reload tab-specific data
        if (profileTab === 'following') {
          (async () => {
            setLoadingFollowing(true);
            const [error, data] = await followService.getFollowingFeed(30, 0);
            if (error) {
              console.error('Error fetching following feed:', error);
            } else if (data) {
              setFollowingFeed((data as any) as DealWithRelations[]);
            }
            setLoadingFollowing(false);
          })();
        } else if (profileTab === 'saved') {
          (async () => {
            setLoadingSaved(true);
            const [error, data] = await dealService.getSavedDeals(user.id);
            if (error) {
              console.error('Error fetching saved deals:', error);
            } else if (data) {
              setSavedDeals(data as DealWithRelations[]);
            }
            setLoadingSaved(false);
          })();
        }
      }
    }, [user?.id, profileTab])
  );

  const userDeals = {
    approved: fetchedUserDeals.filter(d => d.status === 'live'),
    pending: fetchedUserDeals.filter(d =>
      ['pending', 'draft', 'scheduled'].includes(d.status as string)
    ),
    rejected: fetchedUserDeals.filter(d => ['archived', 'expired'].includes(d.status as string)),
  };

  const handleTabChange = (tabId: 'approved' | 'pending' | 'rejected') => setActiveTab(tabId);

  const handleDealPress = (deal: DealWithRelations) => {
    router.push({
      pathname: '/deal-details',
      params: {
        id: deal.id,
        title: deal.title,
        description: deal.description,
        price: deal.price.toString(),
        originalPrice: deal.original_price?.toString() || '',
        location: deal.city,
        distance: deal.city ? '0 mi' : 'N/A',
        image:
          deal.images?.[0] ||
          'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400',
        upvotes: deal.votes_up?.toString() || '0',
        downvotes: deal.votes_down?.toString() || '0',
        comments: deal.comment_count?.toString() || '0',
        postedBy: deal.created_by_user?.username || 'Unknown',
        createdAt: deal.created_at,
        isVerified:
          deal.created_by_user?.role === 'verified' || deal.created_by_user?.role === 'business'
            ? 'true'
            : 'false',
        isSample: 'false',
      },
    });
  };

  const handleSettingsPress = () => router.push('/settings');


  // Open custom logout dialog (no browser Alert on web)
  const openLogoutDialog = () => {
    setLogoutError(null);
    setShowLogoutConfirm(true);
  };

  // Execute logout
  const doLogout = async () => {
    if (loggingOut) return;
    try {
      setLogoutError(null);
      setLoggingOut(true);
      await signOut();
      setShowLogoutConfirm(false);
      router.replace('/sign-in');
    } catch (e: any) {
      setLogoutError(e?.message || 'Failed to sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6366f1', '#8b5cf6', '#d946ef']} style={styles.guestGradient}>
          <View style={styles.guestContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.guestIconContainer}
            >
              <UserIcon size={48} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.guestTitle}>Join the SpicyBeats Community</Text>
            <Text style={styles.guestDescription}>
              Connect with deal hunters, build your reputation, and never miss amazing savings again!
            </Text>

            <View style={styles.benefitsContainer}>
              {[
                { icon: '🎯', text: 'Personalized deal alerts' },
                { icon: '⭐', text: 'Build your reputation' },
                { icon: '💰', text: 'Exclusive member deals' },
              ].map((benefit, idx) => (
                <View key={idx} style={styles.benefitItem}>
                  <Text style={styles.benefitEmoji}>{benefit.icon}</Text>
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.joinButtonWrapper} onPress={() => router.push('/sign-in')}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Get Started Free</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.simpleHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.searchBtn}>
          <Search size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.profileHeader}>
          <View style={styles.profileHeaderContent}>
            <View style={styles.profileInfoSection}>
              <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.avatar}>
                <Text style={styles.avatarText}>{profile?.username?.[0]?.toUpperCase() || 'U'}</Text>
              </LinearGradient>

              <View style={styles.profileInfo}>
                <View style={styles.nameContainer}>
                  <Text style={styles.username}>{profile?.username || 'Guest User'}</Text>
                  {profile?.is_verified_business && (
                    <View style={styles.verifiedContainer}>
                      <Shield size={16} color="#10B981" />
                    </View>
                  )}
                  
                  {Platform.OS === 'web' && (
                    <View style={styles.inlineStatsContainer}>
                      <LinearGradient colors={['#10b981', '#059669']} style={styles.inlineStat}>
                        <Text style={styles.inlineStatNumber}>{userStats.totalPosts}</Text>
                        <Text style={styles.inlineStatLabel}>Posts</Text>
                      </LinearGradient>
                      <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.inlineStat}>
                        <Text style={styles.inlineStatNumber}>{followCounts?.followers || 0}</Text>
                        <Text style={styles.inlineStatLabel}>Followers</Text>
                      </LinearGradient>
                      <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.inlineStat}>
                        <Text style={styles.inlineStatNumber}>{(followCounts?.following_users || 0) + (followCounts?.following_stores || 0)}</Text>
                        <Text style={styles.inlineStatLabel}>Following</Text>
                      </LinearGradient>
                      <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.inlineStat}>
                        <Text style={styles.inlineStatNumber}>{userStats.reputation}</Text>
                        <Text style={styles.inlineStatLabel}>Reputation</Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>

                <View style={styles.levelContainer}>
                  <Crown size={14} color="#fbbf24" />
                  <Text style={styles.levelText}>{userStats.level}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <Calendar size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.memberSince}>{userStats.memberSince}</Text>
                </View>

                {Platform.OS !== 'web' && (
                  <View style={styles.mobileStatsContainer}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.mobileStatCard}>
                      <Award size={16} color="#FFFFFF" />
                      <Text style={styles.mobileStatNumber}>{userStats.totalPosts}</Text>
                      <Text style={styles.mobileStatLabel}>Posts</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.mobileStatCard}>
                      <Zap size={16} color="#FFFFFF" />
                      <Text style={styles.mobileStatNumber}>{followCounts?.followers || 0}</Text>
                      <Text style={styles.mobileStatLabel}>Followers</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.mobileStatCard}>
                      <ThumbsUp size={16} color="#FFFFFF" />
                      <Text style={styles.mobileStatNumber}>{(followCounts?.following_users || 0) + (followCounts?.following_stores || 0)}</Text>
                      <Text style={styles.mobileStatLabel}>Following</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.mobileStatCard}>
                      <Eye size={16} color="#FFFFFF" />
                      <Text style={styles.mobileStatNumber}>{userStats.reputation}</Text>
                      <Text style={styles.mobileStatLabel}>Reputation</Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.headerRightButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
                <Settings size={22} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={openLogoutDialog}>
                <LogOut size={22} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Profile Tabs */}
        <View style={styles.tabsBar}>
          {['overview','following','saved'].map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setProfileTab(key as any)}
              style={[styles.tabPill, profileTab === key && styles.tabPillActive]}
            >
              <Text style={[styles.tabPillText, profileTab === key && styles.tabPillTextActive]}>
                {key === 'overview' ? 'Overview' : key === 'following' ? 'Following' : 'Saved'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Deals (Overview) */}
        {profileTab === 'overview' && (
        <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Deals</Text>

          <View style={styles.tabContainer}>
            {[
              { id: 'approved', name: 'Live', count: userDeals.approved.length, color: '#10b981' },
              { id: 'pending', name: 'Review', count: userDeals.pending.length, color: '#f59e0b' },
              { id: 'rejected', name: 'Declined', count: userDeals.rejected.length, color: '#ef4444' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabWrapper}
                onPress={() => handleTabChange(tab.id as 'approved' | 'pending' | 'rejected')}
              >
                {activeTab === (tab.id as any) ? (
                  <LinearGradient colors={[tab.color, `${tab.color}dd`]} style={styles.tab}>
                    <Text style={styles.tabTextActive}>{tab.name}</Text>
                    <View style={styles.tabBadgeActive}>
                      <Text style={styles.tabBadgeTextActive}>{tab.count}</Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Text style={styles.tabText}>{tab.name}</Text>
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{tab.count}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {loadingDeals ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>⏳</Text>
              <Text style={styles.emptyStateText}>Loading your deals...</Text>
            </View>
          ) : (
            <View style={styles.dealsList}>
              {userDeals[activeTab].map(deal => (
                <TouchableOpacity key={deal.id} style={styles.dealItem} onPress={() => handleDealPress(deal)}>
                  <View style={styles.dealHeader}>
                    <Text style={styles.dealTitle} numberOfLines={1}>
                      {deal.title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        deal.status === 'live' && styles.statusApproved,
                        ['pending', 'draft', 'scheduled'].includes(deal.status) && styles.statusPending,
                        ['archived', 'expired'].includes(deal.status) && styles.statusRejected,
                      ]}
                    >
                      {deal.status === 'live' && <CheckCircle size={12} color="#059669" />}
                      {['pending', 'draft', 'scheduled'].includes(deal.status) && (
                        <Clock size={12} color="#d97706" />
                      )}
                      {['archived', 'expired'].includes(deal.status) && <XCircle size={12} color="#dc2626" />}
                      <Text
                        style={[
                          styles.statusText,
                          deal.status === 'live' && styles.statusTextApproved,
                          ['pending', 'draft', 'scheduled'].includes(deal.status) && styles.statusTextPending,
                          ['archived', 'expired'].includes(deal.status) && styles.statusTextRejected,
                        ]}
                      >
                        {deal.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dealMeta}>
                    <View style={styles.dealStats}>
                      <View style={styles.statItem}>
                        <ThumbsUp size={14} color="#10b981" />
                        <Text style={styles.dealStatText}>{deal.votes_up || 0}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <MessageCircle size={14} color="#6366f1" />
                        <Text style={styles.dealStatText}>{deal.comment_count || 0}</Text>
                      </View>
                    </View>
                    <Text style={styles.dealTime}>{formatTimeAgo(deal.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {userDeals[activeTab].length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateEmoji}>
                    {activeTab === 'approved' ? '🎯' : activeTab === 'pending' ? '⏳' : '❌'}
                  </Text>
                  <Text style={styles.emptyStateText}>No {activeTab} deals yet</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loadingActivities ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>⏳</Text>
              <Text style={styles.emptyStateText}>Loading activities...</Text>
            </View>
          ) : fetchedActivities.length > 0 ? (
            fetchedActivities.map(activity => (
              <View key={activity.id} style={styles.activityItem}>
                <LinearGradient
                  colors={
                    activity.activity_type === 'vote' ||
                    activity.activity_type === 'unvote' ||
                    activity.activity_type === 'vote_change'
                      ? ['#10b981', '#059669']
                      : activity.activity_type === 'comment'
                      ? ['#3b82f6', '#2563eb']
                      : activity.activity_type === 'post'
                      ? ['#8b5cf6', '#7c3aed']
                      : activity.activity_type === 'save' || activity.activity_type === 'unsave'
                      ? ['#fbbf24', '#f59e0b']
                      : ['#94a3b8', '#64748b']
                  }
                  style={styles.activityIcon}
                >
                  {activity.activity_type === 'vote' ||
                  activity.activity_type === 'unvote' ||
                  activity.activity_type === 'vote_change' ? (
                    <ThumbsUp size={16} color="#FFFFFF" />
                  ) : activity.activity_type === 'comment' ? (
                    <MessageCircle size={16} color="#FFFFFF" />
                  ) : activity.activity_type === 'post' ? (
                    <Edit3 size={16} color="#FFFFFF" />
                  ) : activity.activity_type === 'save' || activity.activity_type === 'unsave' ? (
                    <Award size={16} color="#FFFFFF" />
                  ) : (
                    <Clock size={16} color="#FFFFFF" />
                  )}
                </LinearGradient>
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{activity.description}</Text>
                  <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🤷</Text>
              <Text style={styles.emptyStateText}>No recent activity</Text>
              <Text style={styles.emptyStateSubtext}>
                Start interacting with deals to see your activity here!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      
        </>
        )}

        {profileTab === 'following' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Following Feed</Text>
            {loadingFollowing ? (
              <View style={styles.emptyState}><Text style={styles.emptyStateText}>Loading feed...</Text></View>
            ) : followingFeed.length ? (
              followingFeed.map((deal: any) => (
                <DealCard 
                  key={deal.id} 
                  deal={{...deal, distance: '0 mi', isPinned: false, isSample: false}} 
                  isGuest={false}
                  userRole={profile?.role || 'user'}
                  onVote={async (dealId, voteType) => {
                    if (user?.id) {
                      await dealService.voteDeal(dealId.toString(), user.id, voteType);
                    }
                  }}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🧭</Text>
                <Text style={styles.emptyStateText}>Follow users or stores to see their deals here.</Text>
              </View>
            )}
          </View>
        )}

        {profileTab === 'saved' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Deals</Text>
            {loadingSaved ? (
              <View style={styles.emptyState}><Text style={styles.emptyStateText}>Loading saved deals...</Text></View>
            ) : savedDeals.length ? (
              savedDeals.map((deal: any) => (
                <DealCard 
                  key={deal.id} 
                  deal={{...deal, distance: '0 mi', isPinned: false, isSample: false}} 
                  isGuest={false}
                  userRole={profile?.role || 'user'}
                  onVote={async (dealId, voteType) => {
                    if (user?.id) {
                      await dealService.voteDeal(dealId.toString(), user.id, voteType);
                    }
                  }}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>💾</Text>
                <Text style={styles.emptyStateText}>No saved deals yet</Text>
                <Text style={styles.emptyStateSubtext}>Save deals you're interested in to see them here!</Text>
              </View>
            )}
          </View>
        )}


</ScrollView>

      {/* Logout Confirm Dialog (custom, web & native) */}
      {showLogoutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out of SpicyBeats?</Text>

            {logoutError ? <Text style={styles.modalError}>{logoutError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={doLogout}
                disabled={loggingOut}
              >
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.modalConfirmGradient}>
                  {loggingOut ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Sign Out</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  guestGradient: { flex: 1 },
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  guestIconContainer: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  guestTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  guestDescription: { fontSize: 17, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 26, marginBottom: 32 },
  benefitsContainer: { marginBottom: 40 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  benefitEmoji: { fontSize: 24, marginRight: 16 },
  benefitText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  joinButtonWrapper: { borderRadius: 16, overflow: 'hidden' },
  joinButton: { paddingHorizontal: 40, paddingVertical: 18 },
  joinButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },

  profileHeader: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 16 },
  profileHeaderContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  profileInfoSection: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginRight: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  profileInfo: { flex: 1 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  username: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginRight: 8, letterSpacing: -0.3 },
  verifiedContainer: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 12, padding: 4 },
  levelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  levelText: { fontSize: 15, fontWeight: '700', color: '#fbbf24', marginLeft: 6 },
  memberInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  memberSince: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginLeft: 6, fontWeight: '500' },

  headerRightButtons: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  iconButton: { padding: 8, marginLeft: 10 },

  inlineStatsContainer: { 
    flexDirection: 'row', 
    marginLeft: 12, 
    gap: 16 
  },
  inlineStat: { 
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50
  },
  inlineStatNumber: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },
  inlineStatLabel: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: 'rgba(255,255,255,0.8)' 
  },

  // Mobile Stats
  mobileStatsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10, 
    width: '100%' 
  },
  mobileStatCard: {
    width: '23%', 
    padding: 8, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 4,
  },
  mobileStatNumber: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    marginTop: 4, 
    marginBottom: 2 
  },
  mobileStatLabel: { 
    fontSize: 9, 
    fontWeight: '600', 
    color: 'rgba(255,255,255,0.9)', 
    textAlign: 'center', 
    lineHeight: 12 
  },

  section: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginVertical: 8, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 20, letterSpacing: -0.3 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabWrapper: { flex: 1, marginHorizontal: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  tabInactive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b', marginRight: 6 },
  tabTextActive: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginRight: 6 },
  tabBadge: { backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  tabBadgeText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabBadgeTextActive: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  dealsList: { marginTop: 8 },
  dealItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dealTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1e293b', marginRight: 12 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusApproved: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusRejected: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '700', marginLeft: 4, textTransform: 'capitalize' },
  statusTextApproved: { color: '#059669' },
  statusTextPending: { color: '#d97706' },
  statusTextRejected: { color: '#dc2626' },

  dealMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealStats: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  dealStatText: { fontSize: 14, color: '#64748b', marginLeft: 4, fontWeight: '600' },
  dealTime: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyStateEmoji: { fontSize: 48, marginBottom: 16 },
  emptyStateText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  emptyStateSubtext: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8 },

  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  activityIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activityContent: { flex: 1 },
  activityAction: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  activityTime: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  bottomPadding: { height: 100 },

  /* Modal */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
  },
  modalCard: {
    width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalMessage: { fontSize: 14, color: '#374151', marginBottom: 12 },
  modalError: { color: '#dc2626', fontWeight: '600', marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  modalBtn: { marginLeft: 10 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f3f4f6' },
  modalCancelText: { color: '#374151', fontWeight: '700' },
  modalConfirm: { borderRadius: 10, overflow: 'hidden' },
  modalConfirmGradient: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  modalConfirmText: { color: '#fff', fontWeight: '800' },

  tabsBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    padding: 6,
    marginTop: 12,
    marginBottom: 16,
    gap: 6,
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  tabPillActive: {
    backgroundColor: '#6366f1',
  },
  tabPillText: {
    color: '#1f2937',
    fontWeight: '700'
  },
  tabPillTextActive: {
    color: '#ffffff',
  },

  // Simple Header
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
});
