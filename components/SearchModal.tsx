import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search, Zap } from 'lucide-react-native';
import { useSearch } from '@/contexts/SearchProvider';
import { dealService, DealWithRelations } from '@/services/dealService';
import { useDebounce } from '@/hooks/useDebounce';
import { router } from 'expo-router';
import { useCurrency } from '@/contexts/CurrencyProvider';

function SearchResultItem({ item }: { item: DealWithRelations }) {
  const { closeSearch } = useSearch();
  const { formatPrice } = useCurrency();

  const handlePress = () => {
    closeSearch();
    router.push(`/deal-details?id=${item.id}`);
  };

  return (
    <TouchableOpacity style={styles.resultItem} onPress={handlePress}>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SearchModal() {
  const { isSearchOpen, closeSearch } = useSearch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const [error, data] = await dealService.getDeals({ sortBy: 'popular' });
    if (error) {
      console.error("Search failed:", error);
      setResults([]);
    } else {
      const filtered = (data || []).filter(deal =>
        deal.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen]);

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isSearchOpen}
      onRequestClose={closeSearch}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <Search size={20} color="#6366f1" />
            <TextInput
              style={styles.input}
              placeholder="Search for amazing deals..."
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
          <TouchableOpacity onPress={closeSearch} style={styles.closeButton}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#6366f1" />}

        {!loading && results.length === 0 && query.length > 1 && (
          <View style={styles.emptyState}>
            <Zap size={48} color="#e2e8f0" />
            <Text style={styles.emptyText}>No results found for "{query}"</Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <SearchResultItem item={item} />}
          contentContainerStyle={styles.resultsContainer}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1e293b' },
  closeButton: { marginLeft: 16, padding: 8 },
  resultsContainer: { padding: 16 },
  resultItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultContent: {},
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  resultPrice: { fontSize: 14, fontWeight: 'bold', color: '#10b981' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyText: { marginTop: 16, fontSize: 18, color: '#94a3b8', fontWeight: '600' },
});