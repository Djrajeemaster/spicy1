import { Tabs } from 'expo-router';
import { Chrome as Home, TrendingUp, Plus, Bell, User, MapPin, Bookmark } from 'lucide-react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeProvider';

export default function TabLayout() {
  const { theme, colors } = useTheme();
  const [isDesktopWeb, setIsDesktopWeb] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 1024
  );

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktopWeb ? { display: 'none' } : {
          ...styles.tabBar,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' && !isDesktopWeb ? { paddingBottom: 20, height: 90 } : {})
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={100} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          )
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Home size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="updeals"
        options={{
          title: 'Trending',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <TrendingUp size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.postButtonContainer}>
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={[styles.postButton, focused && styles.postButtonActive]}
              >
                <Plus size={24} color="#FFFFFF" strokeWidth={3} />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <User size={focused ? 24 : 22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          href: null, 
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: null, 
        }}
      />
      <Tabs.Screen name="following" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />

      {/* NEW: Add the settings screen here */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // This hides it from the tab bar
        }}
      />
      {/* NEW: Add the edit-profile screen here */}
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null, // This hides it from the tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 12,
    height: Platform.OS === 'ios' ? 90 : 70,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  iconContainer: {
    padding: 4,
  },
  iconContainerActive: {
    transform: [{ scale: 1.1 }],
  },
  postButtonContainer: {
    marginTop: -8,
  },
  postButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postButtonActive: {
    transform: [{ scale: 1.05 }],
  },
});
