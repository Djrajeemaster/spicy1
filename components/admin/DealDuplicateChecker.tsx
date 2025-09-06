import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { apiClient } from '@/utils/apiClient';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarDeals: Array<{
    id: string;
    title: string;
    similarity: number;
    matchReasons: string[];
  }>;
}

interface DealDuplicateCheckerProps {
  dealData: {
    title: string;
    description: string;
    price: number;
    store_id: string;
    category_id: string;
    deal_url?: string;
    coupon_code?: string;
  };
  onDuplicateFound: (duplicates: DuplicateCheckResult) => void;
}

export const DealDuplicateChecker: React.FC<DealDuplicateCheckerProps> = ({
  dealData,
  onDuplicateFound
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkForDuplicates = async () => {
    if (!dealData.title || !dealData.store_id) return;

    setIsChecking(true);
    try {
      const response: DuplicateCheckResult = await apiClient.post('/api/deals/check-duplicates', {
        title: dealData.title,
        description: dealData.description,
        price: dealData.price,
        store_id: dealData.store_id,
        category_id: dealData.category_id,
        deal_url: dealData.deal_url,
        coupon_code: dealData.coupon_code
      });

      setLastChecked(new Date());
      
      if (response.similarDeals && response.similarDeals.length > 0) {
        onDuplicateFound(response);
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      Alert.alert('Error', 'Failed to check for duplicates');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Auto-check when deal data changes significantly
    if (dealData.title && dealData.title.length > 5) {
      const timeoutId = setTimeout(() => {
        checkForDuplicates();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [dealData.title, dealData.store_id, dealData.price]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Duplicate Check</Text>
        <TouchableOpacity 
          style={[styles.checkButton, isChecking && styles.checkingButton]}
          onPress={checkForDuplicates}
          disabled={isChecking}
        >
          <Text style={styles.checkButtonText}>
            {isChecking ? 'Checking...' : 'Check Duplicates'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {lastChecked && (
        <Text style={styles.lastChecked}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  checkButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  checkingButton: {
    backgroundColor: '#9ca3af',
  },
  checkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  lastChecked: {
    fontSize: 12,
    color: '#64748b',
  },
});
