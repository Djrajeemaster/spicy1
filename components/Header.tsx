// components/Header.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { Bell, ChevronDown, LogIn, Sparkles, Search, Filter, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserBadge } from '@/components/UserBadge';
import { getRolePrivileges } from '@/types/user';
import { useAuth } from '@/contexts/AuthProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { alertService } from '@/services/alertService';

import { canAccessAdmin } from '@/lib/supabase';
import { router } from 'expo-router';
import { logger } from '@/utils/logger';

interface HeaderProps {
  onPostPress?: () => void;
  onAlertsPress?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onLocationToggle?: () => void;
  locationEnabled?: boolean;
  showFilters?: boolean;
  onFiltersToggle?: () => void;
  filtersActive?: boolean;
  scrollY?: Animated.Value; // Add scroll position prop
}

export function Header({
  onPostPress,
  onAlertsPress,
  searchQuery = '',
  onSearchChange,
  onLocationToggle,
  locationEnabled = false,
  showFilters = false,
  onFiltersToggle,
  filtersActive = false,
  scrollY,
}: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const { theme, colors } = useTheme();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  
  // Animation value for subheader (search/filter bar)
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const filtersOpacity = useRef(new Animated.Value(1)).current;
  const [isDesktopWeb, setIsDesktopWeb] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 1024
  );

  // Fetch alert count
  useEffect(() => {
    if (user?.id) {
      const fetchAlertCount = async () => {
        try {
          const { data } = await alertService.getUnreadCount(user.id);
          setAlertCount(data || 0);
        } catch (error) {
          logger.error('Failed to fetch alert count', error);
        }
      };
      
      fetchAlertCount();
      
      // Refresh alert count every 30 seconds
      const interval = setInterval(fetchAlertCount, 30000);
      return () => clearInterval(interval);
    } else {
      setAlertCount(0);
    }
  }, [user?.id]);

  // Handle window resize for responsive layout
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        const newIsDesktop = window.innerWidth >= 1024;
        setIsDesktopWeb(newIsDesktop);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Scroll-based subheader animation (only search/filter bar)
  useEffect(() => {
    if (!scrollY) return;
    const listener = scrollY.addListener(({ value }) => {
      const threshold = 100;
      const progress = Math.min(value / threshold, 1);
      const elementsOpacity = 1 - progress;
      Animated.parallel([
        Animated.timing(searchOpacity, {
          toValue: elementsOpacity,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(filtersOpacity, {
          toValue: elementsOpacity,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY, searchOpacity, filtersOpacity]);

  // Sign-out dialog state
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Memoize expensive calculations
  const isGuest = !user;
  const userRole = profile?.role || 'guest';
  const reputation = profile?.reputation || 0;
  
  const privileges = useMemo(() => 
    getRolePrivileges(userRole, reputation), 
    [userRole, reputation]
  );
  
  const showFullSearch = !!onSearchChange;

  const showAdminButton = useMemo(() => 
    profile && canAccessAdmin(profile.role), 
    [profile?.role]
  );

  const handlePostPress = useCallback(() => {
    if (!privileges.canPost) {
      // Keep your existing alert style elsewhere if you want; sign-out uses custom dialog
      return;
    }
    onPostPress?.();
  }, [privileges.canPost, onPostPress]);

  const openSignOutDialog = () => {
    setSignOutError(null);
    setShowUserMenu(false);
    setShowSignOutConfirm(true);
  };

  const doSignOut = useCallback(async () => {
    if (signingOut) return;
    try {
      setSignOutError(null);
      setSigningOut(true);
      logger.authEvent('sign_out_attempt', user?.id);
      await signOut();
      setShowSignOutConfirm(false);
      setShowUserMenu(false);
      logger.authEvent('sign_out_success', user?.id);
      router.replace('/sign-in');
    } catch (e: any) {
      logger.authEvent('sign_out_failed', user?.id, { error: e?.message });
      setSignOutError(e?.message || 'Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }, [signingOut, signOut, user?.id]);

  const handleAuthPress = useCallback(() => {
    if (isGuest) {
      router.push('/sign-in');
    } else {
      openSignOutDialog();
    }
  }, [isGuest]);

  const handleAlertsPress = useCallback(() => {
    onAlertsPress ? onAlertsPress() : router.push('/alerts');
  }, [onAlertsPress]);

  const handleAdminAccess = useCallback(() => {
    router.push('/admin');
  }, []);

  return (
  <Animated.View style={styles.container}>
      <LinearGradient
        colors={['#030849', '#1e40af', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.mainRow, isDesktopWeb && showFullSearch && styles.mainRowDesktop]}>
          <View style={[styles.leftSection, isDesktopWeb && styles.leftSectionDesktop]}>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.logoContainer}>
              <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} style={styles.logo}>
                <Sparkles size={18} color="#FFFFFF" />
              </LinearGradient>
              {/* Show full text only on desktop, just icon on mobile */}
              {isDesktopWeb && <Text style={styles.appName}>SpicyBeats</Text>}
            </TouchableOpacity>
          </View>

          <View style={[styles.rightSection, isDesktopWeb && styles.rightSectionDesktop]}>
            {/* Desktop Web Search Bar with animation */}
            {isDesktopWeb && showFullSearch && (
              <Animated.View style={[
                styles.desktopSearchContainer,
                {
                  opacity: searchOpacity,
                  transform: [{
                    translateY: searchOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }],
                  height: searchOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 48],
                  }),
                  overflow: 'hidden',
                }
              ]}>
                <View style={styles.desktopSearchBar}>
                  <Search size={20} color="#6366f1" style={styles.searchIcon} />
                  <TextInput
                    style={styles.desktopSearchInput}
                    placeholder="Search amazing deals..."
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    placeholderTextColor="#94a3b8"
                  />
                  {searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => onSearchChange?.('')}>
                      <Text style={styles.clearButton}>×</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Animated.View style={{
                  opacity: filtersOpacity,
                  transform: [{
                    translateY: filtersOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }],
                  height: filtersOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 50], // Increased by 2 points
                  }),
                  overflow: 'hidden',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={styles.desktopFilterButton} onPress={onFiltersToggle}>
                      <LinearGradient
                        colors={(showFilters || filtersActive) ? ['#6366f1', '#4f46e5'] : ['#f1f5f9', '#e2e8f0']}
                        style={styles.desktopFilterGradient}
                      >
                        <Filter size={16} color={(showFilters || filtersActive) ? '#FFFFFF' : '#64748b'} />
                        {filtersActive && !showFilters && (
                          <View style={styles.filterActiveDot} />
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.desktopLocationButton} onPress={onLocationToggle}>
                      <LinearGradient
                        colors={locationEnabled ? ['#10b981', '#059669'] : ['#f1f5f9', '#e2e8f0']}
                        style={styles.desktopLocationGradient}
                      >
                        <Navigation size={18} color={locationEnabled ? '#FFFFFF' : '#64748b'} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </Animated.View>
            )}
            {!showFullSearch && (
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)')}>
                <Search size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {showAdminButton && (
              <TouchableOpacity style={styles.adminButton} onPress={handleAdminAccess}>
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.adminButtonGradient}>
                  <Text style={styles.adminButtonText}>Admin</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {!isGuest && isDesktopWeb && (
              <TouchableOpacity
                style={[styles.postButton, !privileges.canPost && styles.disabledButton]}
                onPress={handlePostPress}
                disabled={!privileges.canPost}
              >
                <LinearGradient
                  colors={privileges.canPost ? ['#10b981', '#059669'] : ['#94a3b8', '#64748b']}
                  style={styles.postButtonGradient}
                >
                  <Text style={styles.postButtonText}>+ Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}



            <TouchableOpacity style={styles.alertButton} onPress={handleAlertsPress}>
              <View style={styles.alertIconContainer}>
                <Bell size={22} color="#FFFFFF" />
                {alertCount > 0 && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{alertCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {isGuest ? (
              <TouchableOpacity style={styles.loginButton} onPress={handleAuthPress}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.loginGradient}>
                  <LogIn size={18} color="#FFFFFF" />
                  <Text style={styles.loginButtonText}>Join</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.userButton}
                onPress={() => {
                  setShowUserMenu(!showUserMenu);
                }}
              >
                <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.avatar}>
                  <Text style={styles.avatarText}>{profile?.username?.[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <ChevronDown size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>





        {/* Mobile/Tablet Search Bar */}
        {!isDesktopWeb && showFullSearch && (
          <Animated.View style={{
            paddingHorizontal: 8,
            paddingBottom: 6, // Increased by 2 points
            opacity: searchOpacity,
            transform: [{
              translateY: searchOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              })
            }],
            height: searchOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 42], // Increased by 2 points
            }),
            overflow: 'hidden',
          }}>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color="#6366f1" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search amazing deals..."
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholderTextColor="#94a3b8"
                />
                {searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => onSearchChange?.('')}>
                    <Text style={styles.clearButton}>×</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={styles.filterButton} onPress={onFiltersToggle}>
                  <LinearGradient
                    colors={(showFilters || filtersActive) ? ['#6366f1', '#4f46e5'] : ['#f1f5f9', '#e2e8f0']}
                    style={styles.filterGradient}
                  >
                    <Filter size={20} color={(showFilters || filtersActive) ? '#FFFFFF' : '#64748b'} />
                    {filtersActive && !showFilters && (
                      <View style={styles.filterActiveDot} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.locationButton} onPress={onLocationToggle}>
                  <LinearGradient
                    colors={locationEnabled ? ['#10b981', '#059669'] : ['#f1f5f9', '#e2e8f0']}
                    style={styles.locationGradient}
                  >
                    <Navigation size={20} color={locationEnabled ? '#FFFFFF' : '#64748b'} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}


      </LinearGradient>

      {/* User Menu Dropdown */}
      {showUserMenu && (
        <View style={styles.userMenu}>
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => {
              setShowUserMenu(false);
              router.push('/profile');
            }}
          >
            <Text style={styles.userMenuText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userMenuItem}
            onPress={() => {
              setShowUserMenu(false);
              router.push('/settings');
            }}
          >
            <Text style={styles.userMenuText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.userMenuItem, styles.userMenuItemLast]}
            onPress={openSignOutDialog}
          >
            <Text style={styles.userMenuText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign-out Confirm Dialog (custom, works on web & native) */}
      {showSignOutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out of SpicyBeats?
            </Text>

            {signOutError ? (
              <Text style={styles.modalError}>{signOutError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setShowSignOutConfirm(false)}
                disabled={signingOut}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={doSignOut}
                disabled={signingOut}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modalConfirmGradient}
                >
                  {signingOut ? (
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#030849', zIndex: 9999, position: 'relative' },
  gradient: { paddingTop: 0, paddingBottom: 0 },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18, // Increased vertical padding
    minHeight: 72,
    height: 72,
  },
  mainRowDesktop: {
    justifyContent: 'flex-start', // Desktop with search: flex-start for flex distribution
    paddingHorizontal: 16, // Slightly more padding on desktop
  },
  leftSection: { 
    flexDirection: 'row', 
    alignItems: 'center',
    // Mobile default - no flex constraints
  },
  leftSectionDesktop: {
    flex: 1, // Fixed flex for logo area on desktop
    minWidth: 200, // Ensure logo has minimum space
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    width: 40, height: 40, borderRadius: 12, marginRight: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  appName: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  rightSection: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center', // Center all right section contents vertically
    gap: 12,
  },
  rightSectionDesktop: {
    flex: 3, // Give more flex space to the right section for search on desktop
    justifyContent: 'flex-end', // Align items to the right when no search
  },

  iconButton: { padding: 4, marginRight: 4 },
  adminButton: { borderRadius: 12, overflow: 'hidden', marginRight: 2 },
  adminButtonGradient: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 24, justifyContent: 'center', alignItems: 'center', minHeight: 40, marginRight: 2 },
  adminButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  postButton: { borderRadius: 24, overflow: 'hidden', marginRight: 2, minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  postButtonGradient: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 24, justifyContent: 'center', alignItems: 'center', minHeight: 40 },
  postButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  alertButton: { marginRight: 4, width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  alertIconContainer: { position: 'relative', width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  alertBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444',
    borderRadius: 8, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#FFFFFF',
  },
  alertBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },

  loginButton: { borderRadius: 14, overflow: 'hidden' },
  loginGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4 },
  loginButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginLeft: 4 },



  userButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 4, width: 48, height: 48, borderRadius: 16, justifyContent: 'center' },
  avatar: {
  width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  marginRight: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  userMenu: {
    position: 'absolute', top: 60, right: 20, backgroundColor: '#FFFFFF',
    borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, zIndex: 1000, minWidth: 150,
  },
  userMenuItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userMenuItemLast: { borderBottomWidth: 0 },
  userMenuText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  searchSection: { paddingHorizontal: 8, paddingBottom: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)', borderRadius: 12,
    paddingHorizontal: 8, height: 32, marginRight: 6,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  clearButton: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', paddingHorizontal: 4 },

  filterButton: { borderRadius: 10, overflow: 'hidden', marginRight: 4 },
  filterGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  filterActiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  locationButton: { borderRadius: 10, overflow: 'hidden' },
  locationGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // Desktop search styles
  desktopSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 0,
    minWidth: 400,
  },
  desktopSearchBar: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.10)',
  borderRadius: 16,
  paddingHorizontal: 12,
  height: 48,
  marginRight: 8,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.15)',
  minWidth: 300,
  },
  desktopSearchInput: {
  flex: 1,
  fontSize: 15,
  color: '#1e293b',
  fontWeight: '500',
  paddingVertical: 10,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  },
  desktopFilterButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 2,
  },
  desktopFilterGradient: {
  width: 48,
  height: 48,
  borderRadius: 16,
  marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  desktopLocationButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 4,
  },
  desktopLocationGradient: {
  width: 48,
  height: 48,
  borderRadius: 16,
  marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Modal styles */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
    zIndex: 2000,
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
});
