import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AtSign, Send, MailQuestion, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isDesktopWeb, setIsDesktopWeb] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleResize = () => setIsDesktopWeb(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePasswordReset = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccessMessage('Password reset link sent! Please check your email inbox (and spam folder).');
    }
    setLoading(false);
  };

  const renderForm = () => (
    <>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

      {!successMessage && (
        <>
          <View style={isDesktopWeb ? styles.desktopInputGroup : styles.inputGroup}>
            <AtSign color="#94a3b8" size={20} style={styles.icon} />
            <TextInput
              style={isDesktopWeb ? styles.desktopInput : styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onSubmitEditing={handlePasswordReset}
            />
          </View>

          <TouchableOpacity style={styles.buttonWrapper} onPress={handlePasswordReset} disabled={loading}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Send size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.push('/sign-in')} style={styles.backLink}>
        <ArrowLeft size={14} color={isDesktopWeb ? '#6366f1' : '#e2e8f0'} />
        <Text style={isDesktopWeb ? styles.desktopLinkTextMuted : styles.linkText}>
          Back to Sign In
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, isDesktopWeb && styles.desktopRoot]}>
      <View style={isDesktopWeb ? styles.desktopContainer : styles.mobileContainer}>
        {isDesktopWeb && (
          <LinearGradient colors={['#030849', '#1e40af']} style={styles.desktopBrandingPanel}>
            <View style={styles.brandingContent}>
              <MailQuestion size={48} color="#fbbf24" />
              <Text style={styles.desktopAppName}>Forgot Password?</Text>
              <Text style={styles.desktopTagline}>No worries, we'll help you get back in.</Text>
            </View>
          </LinearGradient>
        )}

        <View style={isDesktopWeb ? styles.desktopFormPanel : styles.mobileFormPanel}>
          {!isDesktopWeb && <LinearGradient colors={['#030849', '#1e40af']} style={StyleSheet.absoluteFill} />}
          
          <View style={isDesktopWeb ? styles.desktopCard : styles.formContainer}>
            <Text style={isDesktopWeb ? styles.desktopTitle : styles.title}>Reset Your Password</Text>
            <Text style={isDesktopWeb ? styles.desktopSubtitle : styles.subtitle}>
              Enter your email and we'll send you a link to get back into your account.
            </Text>
            {renderForm()}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- Base & Mobile Styles (copied from sign-in and adapted) ---
  container: { flex: 1 },
  mobileContainer: { flex: 1, justifyContent: 'center' },
  mobileFormPanel: { flex: 1, justifyContent: 'center' },
  formContainer: { paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#e2e8f0', textAlign: 'center', marginBottom: 32, fontWeight: '500' },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16 },
  input: { flex: 1, height: 50, color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  linkText: { color: '#e2e8f0', textAlign: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },

  // --- Desktop Styles (copied from sign-in and adapted) ---
  desktopRoot: { backgroundColor: '#f8fafc' },
  desktopContainer: { flex: 1, flexDirection: 'row' },
  desktopBrandingPanel: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  brandingContent: { alignItems: 'center' },
  desktopAppName: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', marginTop: 16, letterSpacing: -1 },
  desktopTagline: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', maxWidth: 300 },
  desktopFormPanel: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  desktopCard: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', padding: 32, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  desktopTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  desktopSubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  desktopInputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  desktopInput: { flex: 1, height: 50, color: '#1e293b', fontSize: 16, fontWeight: '500' },
  desktopLinkText: { color: '#64748b', textAlign: 'center' },
  desktopLinkTextMuted: { color: '#6366f1', fontWeight: '600' },

  // --- Common Styles ---
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  successText: { color: '#10b981', textAlign: 'center', marginBottom: 16, fontWeight: '600', lineHeight: 20 },
  icon: { marginRight: 12 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});