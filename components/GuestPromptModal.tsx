import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';

interface GuestPromptModalProps {
  visible: boolean;
  onClose: () => void;
  action?: string;
}

export default function GuestPromptModal({ visible, onClose, action }: GuestPromptModalProps) {
  const router = useRouter();
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Sign In Required</Text>
          <Text style={styles.message}>
            Please sign in or sign up to {action || 'perform this action'}.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={() => { router.push('/sign-in'); onClose(); }}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => { router.push('/sign-up'); onClose(); }}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    marginTop: 8,
  },
  closeText: {
    color: '#64748b',
    fontSize: 15,
  },
});
