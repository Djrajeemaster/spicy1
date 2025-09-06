import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions, ImageBackground } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Award, Calendar, Shield, ThumbsUp, UserPlus, UserCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserRole } from '@/types/user';

import { useAuth } from '@/contexts/AuthProvider';
import { userService, type PublicUserProfile } from '@/services/userService';
import { dealService, DealWithRelations } from '@/services/dealService';
import { followService } from '@/services/followService';
import { DealCard } from '@/components/DealCard';
import { UserBadge } from '@/components/UserBadge';
import ChatButton from '@/components/chat/ChatButton';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);

  const dealsToShow = deals.filter(d => d.status === 'live');

  useEffect(() => {
    if (!username) return;

    const loadProfile = async () => {
      setLoading(true);
      const [profileError, profileData] = await userService.getUserByUsername(username as string);

      if (profileError || !profileData) {
        console.error('Failed to load profile for', username);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const [dealsError, dealsData] = await dealService.getUserDeals(profileData.id);
      if (!dealsError && dealsData) {
        setDeals(dealsData);
      }

      if (currentUser) {
        const [followError, followingStatus] = await followService.isFollowingUser(profileData.id);
        if (!followError) {
          setIsFollowing(followingStatus || false);
        }

        const [countsError, countsData] = await followService.getCounts(profileData.id);
        if (!countsError && countsData) {
          setFollowCounts({ followers: countsData.followers, following: countsData.following_users + countsData.following_stores });
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [username, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) {
      router.push('/sign-in');
      return;
    }

    if (isFollowing) {
      await followService.unfollowUser(profile.id);
      setIsFollowing(false);
    } else {
      await followService.followUser(profile.id);
      setIsFollowing(true);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to home screen if there's no history
      router.replace('/(tabs)');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User '{username}' not found.</Text>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
        <ImageBackground
          source={{ uri: 'https://images.pexels.com/photos/1631677/pexels-photo-1631677.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
          style={styles.headerBackground}
        >
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)']} style={styles.headerOverlay}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.mainContent}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.username?.[0]?.toUpperCase() || 'U'}</Text>
              </LinearGradient>
              <View style={styles.nameAndActions}>
                <View>
                  <Text style={styles.username}>{profile.username}</Text>
                  {profile.role && <UserBadge role={profile.role as UserRole} size="medium" />}
                </View>
                
                {currentUser && currentUser.id !== profile.id && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={handleFollowToggle} style={styles.followButton}>
                      <LinearGradient
                        colors={isFollowing ? ['#4b5563', '#6b7280'] : ['#10b981', '#059669']}
                        style={styles.followGradient}
                      >
                        {isFollowing ? <UserCheck size={16} color="#FFFFFF" /> : <UserPlus size={16} color="#FFFFFF" />}
                        <Text style={styles.followText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <ChatButton 
                      userId={profile.id} 
                      style={styles.chatButton}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                )}
                
                {!currentUser && (
                  <TouchableOpacity onPress={() => router.push('/sign-in')} style={styles.followButton}>
                    <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.followGradient}>
                      <UserPlus size={16} color="#FFFFFF" />
                      <Text style={styles.followText}>Sign in to Follow</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={styles.statNumber}>{followCounts.followers}</Text><Text style={styles.statLabel}>Followers</Text></View>
              <View style={styles.statItem}><Text style={styles.statNumber}>{followCounts.following}</Text><Text style={styles.statLabel}>Following</Text></View>
              <View style={styles.statItem}><Text style={styles.statNumber}>{profile.reputation}</Text><Text style={styles.statLabel}>Reputation</Text></View>
              <View style={styles.statItem}><Text style={styles.statNumber}>{dealsToShow.length}</Text><Text style={styles.statLabel}>Deals</Text></View>
            </View>

            <View style={styles.joinDateContainer}>
              <Calendar size={14} color="#64748b" />
              <Text style={styles.joinDateText}>Joined {new Date(profile.join_date!).toLocaleDateString()}</Text>
            </View>
          </View>

          <View style={styles.dealsSection}>
            <Text style={styles.sectionTitle}>Deals Posted by {profile.username}</Text>
            {dealsToShow.length > 0 ? (
              <View style={isDesktop ? styles.dealsGrid : {}}>
                {dealsToShow.map(deal => (
                  <View key={deal.id} style={isDesktop ? styles.dealTile : { marginBottom: 16 }}>
                  <DealCard
                    deal={{
                      id: deal.id,
                      title: deal.title,
                      price: deal.price,
                      original_price: deal.original_price || undefined,
                      image: deal.images?.[0] || '',
                      votes: { up: deal.votes_up || 0, down: deal.votes_down || 0 },
                      comments: deal.comment_count || 0,
                      postedBy: deal.created_by_user?.username || 'Unknown',
                      created_at: deal.created_at || '',
                      isVerified: deal.status === 'live',
                      isSample: false,
                      created_by: deal.created_by
                    }}
                    isGuest={!currentUser}
                    userRole={currentUser?.user_metadata?.role}
                    userId={currentUser?.id}
                    onVote={() => {
                      router.push(`/deal-details?id=${deal.id}`);
                    }}
                  />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noDealsText}>This user hasn't posted any deals yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollView: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#64748b' },
  errorText: { fontSize: 18, color: '#ef4444', marginBottom: 16 },
  linkText: { fontSize: 16, color: '#6366f1', fontWeight: '600' },

  headerBackground: { height: 150 },
  headerOverlay: { flex: 1, justifyContent: 'flex-start', padding: 16, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
  header: { flexDirection: 'row' },
  backButton: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  
  mainContent: { padding: 16, marginTop: -80, zIndex: 1 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 24,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  nameAndActions: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  followButton: { borderRadius: 20, overflow: 'hidden' },
  followGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  followText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  chatButton: { 
    backgroundColor: '#6366f1', 
    borderRadius: 20, 
    paddingVertical: 8, 
    paddingHorizontal: 12 
  },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  joinDateContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  joinDateText: { fontSize: 14, color: '#64748b', marginLeft: 6 },

  dealsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  noDealsText: { textAlign: 'center', color: '#64748b', marginTop: 20 },
  dealsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
  dealTile: { width: '50%', paddingHorizontal: 8 },
});