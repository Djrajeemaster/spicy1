import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AtSign, Lock, LogIn, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthProvider';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function SignInScreen() {
  const { signIn, user, loading: authLoading } = useAuth();
  const { settings, logoUrl } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDesktopWeb, setIsDesktopWeb] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      console.log('User already logged in, redirecting to home');
      router.replace('/(tabs)');
    }
  }, [authLoading, user]);

  // Initialize desktop detection for web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setIsDesktopWeb(window.innerWidth >= 768);
    }
  }, []);

  // Handle window resize for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleResize = () => {
      setIsDesktopWeb(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If still checking auth or user is logged in, show loading
  if (authLoading || user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>
          {user ? 'Redirecting...' : 'Checking authentication...'}
        </Text>
      </View>
    );
  }

  const handleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      if (Platform.OS !== 'web') {
        Alert.alert('Sign In Failed', signInError.message);
      }
    } else {
      // On success, redirect to the home page
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, isDesktopWeb && styles.desktopRoot]}>
      <View style={isDesktopWeb ? styles.desktopContainer : styles.mobileContainer}>
        {isDesktopWeb && (
          <LinearGradient colors={['#030849', '#1e40af']} style={styles.desktopBrandingPanel}>
            <View style={styles.brandingContent}>
              {logoUrl ? (
                <Image 
                  source={{ uri: logoUrl }} 
                  style={styles.brandingLogo}
                  resizeMode="contain"
                />
              ) : (
                <Sparkles size={48} color={settings.headerTextColor} />
              )}
              <Text style={[styles.desktopAppName, { color: settings.headerTextColor }]}>
                {settings.appName}
              </Text>
              <Text style={styles.desktopTagline}>{settings.tagline}</Text>
            </View>
          </LinearGradient>
        )}

        <View style={isDesktopWeb ? styles.desktopFormPanel : styles.mobileFormPanel}>
          {!isDesktopWeb && <LinearGradient colors={['#030849', '#1e40af']} style={StyleSheet.absoluteFill} />}
          
          <View style={isDesktopWeb ? styles.desktopCard : styles.formContainer}>
            {!isDesktopWeb && (
              <View style={styles.mobileBranding}>
                {logoUrl ? (
                  <Image 
                    source={{ uri: logoUrl }} 
                    style={styles.mobileLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <Sparkles size={32} color={settings.headerTextColor} />
                )}
                <Text style={[styles.mobileAppName, { color: settings.headerTextColor }]}>
                  {settings.appName}
                </Text>
              </View>
            )}
            <Text style={isDesktopWeb ? styles.desktopTitle : styles.title}>Welcome Back</Text>
            <Text style={isDesktopWeb ? styles.desktopSubtitle : styles.subtitle}>
              Sign in to your {settings.appName} account
            </Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={isDesktopWeb ? styles.desktopInputGroup : styles.inputGroup}>
              <AtSign color="#94a3b8" size={20} style={styles.icon} />
              <TextInput
                style={isDesktopWeb ? styles.desktopInput : styles.input}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={isDesktopWeb ? styles.desktopInputGroup : styles.inputGroup}>
              <Lock color="#94a3b8" size={20} style={styles.icon} />
              <TextInput
                style={isDesktopWeb ? styles.desktopInput : styles.input}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onSubmitEditing={handleSignIn}
              />
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <Text style={isDesktopWeb ? styles.desktopLinkTextMuted : styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.buttonWrapper} onPress={handleSignIn} disabled={loading}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.button}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <LogIn size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/sign-up')}>
              <Text style={isDesktopWeb ? styles.desktopLinkText : styles.linkText}>
                Don't have an account? <Text style={{ fontWeight: 'bold' }}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- Base ---
  container: { flex: 1 },
  mobileContainer: { flex: 1, justifyContent: 'center' },
  mobileFormPanel: { flex: 1, justifyContent: 'center' },
  formContainer: { paddingHorizontal: 24 },
  
  // --- Mobile Styles ---
  mobileBranding: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mobileLogo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  mobileAppName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#e2e8f0', textAlign: 'center', marginBottom: 32, fontWeight: '500' },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 16, fontWeight: '500'
  },
  linkText: { color: '#e2e8f0', textAlign: 'center' },

  // --- Desktop Styles ---
  desktopRoot: { backgroundColor: '#f8fafc' },
  desktopContainer: { flex: 1, flexDirection: 'row' },
  desktopBrandingPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  brandingContent: { alignItems: 'center' },
  brandingLogo: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  desktopAppName: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: 16,
    color: '#fbbf24',
  },
  desktopTagline: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', maxWidth: 300 },
  desktopFormPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  desktopCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  desktopTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  desktopSubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  desktopInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  desktopInput: { flex: 1, height: 50, color: '#1e293b', fontSize: 16, fontWeight: '500' },
  desktopLinkText: { color: '#64748b', textAlign: 'center' },
  desktopLinkTextMuted: { color: '#6366f1', textAlign: 'left', fontWeight: '600' },

  // --- Common Styles ---
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  loadingText: { color: '#64748b', textAlign: 'center', marginTop: 16, fontSize: 16 },
  icon: { marginRight: 12 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});