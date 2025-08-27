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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { User, AtSign, Lock, Sparkles, CheckSquare } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthProvider';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDesktopWeb, setIsDesktopWeb] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleResize = () => {
      setIsDesktopWeb(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignUp = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const { error: signUpError } = await signUp(email, password, { username });

    if (signUpError) {
      setError(signUpError.message);
      if (Platform.OS !== 'web') {
        Alert.alert('Sign Up Failed', signUpError.message);
      }
    } else if (Platform.OS !== 'web') {
      // Give user confirmation, then redirect
      Alert.alert(
        'Welcome to SpicyBeats!',
        'Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    }
    // On web, the AuthProvider listener will handle the redirect
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, isDesktopWeb && styles.desktopRoot]}>
      <View style={isDesktopWeb ? styles.desktopContainer : styles.mobileContainer}>
        {isDesktopWeb && (
          <LinearGradient colors={['#030849', '#1e40af']} style={styles.desktopBrandingPanel}>
            <View style={styles.brandingContent}>
              <Sparkles size={48} color="#fbbf24" />
              <Text style={styles.desktopAppName}>SpicyBeats</Text>
              <Text style={styles.desktopTagline}>Join the community. Share the heat.</Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}><CheckSquare size={16} color="#10b981" /><Text style={styles.featureText}>Post and vote on deals</Text></View>
                <View style={styles.featureItem}><CheckSquare size={16} color="#10b981" /><Text style={styles.featureText}>Set custom deal alerts</Text></View>
                <View style={styles.featureItem}><CheckSquare size={16} color="#10b981" /><Text style={styles.featureText}>Build your reputation</Text></View>
              </View>
            </View>
          </LinearGradient>
        )}

        <View style={isDesktopWeb ? styles.desktopFormPanel : styles.mobileFormPanel}>
          {!isDesktopWeb && <LinearGradient colors={['#030849', '#1e40af']} style={StyleSheet.absoluteFill} />}
          
          <View style={isDesktopWeb ? styles.desktopCard : styles.formContainer}>
            <Text style={isDesktopWeb ? styles.desktopTitle : styles.title}>Create Account</Text>
            <Text style={isDesktopWeb ? styles.desktopSubtitle : styles.subtitle}>Join the best deal community</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={isDesktopWeb ? styles.desktopInputGroup : styles.inputGroup}>
              <User color="#94a3b8" size={20} style={styles.icon} />
              <TextInput
                style={isDesktopWeb ? styles.desktopInput : styles.input}
                placeholder="Username"
                placeholderTextColor="#94a3b8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

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
                onSubmitEditing={handleSignUp}
              />
            </View>

            <TouchableOpacity style={styles.buttonWrapper} onPress={handleSignUp} disabled={loading}>
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.button}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Sparkles size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Create Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/sign-in')}>
              <Text style={isDesktopWeb ? styles.desktopLinkText : styles.linkText}>
                Already have an account? <Text style={{ fontWeight: 'bold' }}>Sign In</Text>
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
  icon: { marginRight: 12 },
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
  desktopAppName: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', marginTop: 16, letterSpacing: -1 },
  desktopTagline: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', maxWidth: 300, marginBottom: 32 },
  featureList: { alignSelf: 'flex-start', gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
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

  // --- Common Styles ---
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  icon: { marginRight: 12 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 24 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});