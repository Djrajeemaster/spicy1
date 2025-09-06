import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Search, Plus, RefreshCw, CheckSquare, Square, Info, AlertTriangle, User } from 'lucide-react-native';
import { apiClient } from '@/utils/apiClient';
import { useCurrency } from '@/contexts/CurrencyProvider';

interface CompetitorDeal {
  id?: string;
  title: string;
  price: number;
  original_price: number;
  discount_percentage: number;
  store: string;
  competitor: string;
  url: string;
  images?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  isDuplicate?: boolean;
  duplicateReason?: string;
  existingDealId?: number;
  similarityScore?: number;
}

interface User {
  id: string;
  username: string;
  role: string;
}

export default function CompetitorResearch({ onRefresh, users: adminUsers }: { onRefresh?: () => void, users?: User[] }) {
  const [deals, setDeals] = useState<CompetitorDeal[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('00000000-0000-0000-0000-000000000000');
  const [users, setUsers] = useState<User[]>(adminUsers || []);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (adminUsers) {
      setUsers(adminUsers);
    }
  }, [adminUsers]);

  const competitors = [
    'desiDime',
    'cashKaro',
    'couponDunia',
    'grabOn'
  ];

  const stores = [
    'amazon',
    'flipkart',
    'myntra',
    'nykaa',
    'bigbasket'
  ];

  const researchCompetitors = async () => {
    setResearching(true);
    try {
      const response = await apiClient.post('/admin/competitor-research', {
        competitors,
        stores
      }) as { deals: CompetitorDeal[], summary: { total: number, unique: number, duplicates: number } };
      setDeals(response.deals);
      setSelectedDeals(new Set()); // Reset selection when new deals are loaded
      Alert.alert(
        'Research Complete',
        `Found ${response.deals.length} deals\nUnique: ${response.summary.unique}\nDuplicates: ${response.summary.duplicates}`
      );
    } catch (error) {
      console.error('Research error:', error);
      Alert.alert('Error', 'Failed to research competitors');
    } finally {
      setResearching(false);
    }
  };

  const toggleDealSelection = (dealId: string) => {
    const newSelection = new Set(selectedDeals);
    if (newSelection.has(dealId)) {
      newSelection.delete(dealId);
    } else {
      newSelection.add(dealId);
    }
    setSelectedDeals(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedDeals.size === deals.length) {
      setSelectedDeals(new Set());
    } else {
      setSelectedDeals(new Set(deals.map(deal => deal.id!)));
    }
  };

  const insertSelectedDeals = async () => {
    if (selectedDeals.size === 0) {
      Alert.alert('No Selection', 'Please select at least one deal to insert.');
      return;
    }

    setInserting(true);
    try {
      const selectedDealsData = deals.filter(deal => selectedDeals.has(deal.id!));
      const response = await apiClient.post('/admin/insert-researched-deals', {
        deals: selectedDealsData,
        insertDuplicates: includeDuplicates,
        createdBy: selectedUser
      }) as { inserted: number, skipped: number };
      
      Alert.alert(
        'Insertion Complete',
        `${response.inserted} deals inserted${response.skipped > 0 ? `, ${response.skipped} duplicates skipped` : ''}!`
      );
      
      // Remove inserted deals from the list
      setDeals(prev => prev.filter(deal => !selectedDeals.has(deal.id!)));
      setSelectedDeals(new Set());
      
      // Refresh the admin dashboard data to show newly inserted deals
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Insert error:', error);
      Alert.alert('Error', 'Failed to insert deals');
    } finally {
      setInserting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Competitor Research</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Competitors to Research</Text>
        <View style={styles.competitorList}>
          {competitors.map(competitor => (
            <View key={competitor} style={styles.competitorItem}>
              <Text style={styles.competitorText}>{competitor}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Target Stores</Text>
        <View style={styles.storeList}>
          {stores.map(store => (
            <View key={store} style={styles.storeItem}>
              <Text style={styles.storeText}>{store}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Post Deals As</Text>
        <TouchableOpacity
          style={styles.userSelector}
          onPress={() => setShowUserDropdown(!showUserDropdown)}
        >
          <User size={20} color="#6366f1" />
          <Text style={styles.userSelectorText}>
            {users.find(u => u.id === selectedUser)?.username || 'System'} ({users.find(u => u.id === selectedUser)?.role || 'system'})
          </Text>
          <Text style={styles.dropdownArrow}>{showUserDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showUserDropdown && (
          <View style={styles.userDropdown}>
            {users.map(user => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userOption,
                  selectedUser === user.id && styles.userOptionSelected
                ]}
                onPress={() => {
                  setSelectedUser(user.id);
                  setShowUserDropdown(false);
                }}
              >
                <Text style={[
                  styles.userOptionText,
                  selectedUser === user.id && styles.userOptionTextSelected
                ]}>
                  {user.username} ({user.role})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.researchButton]}
          onPress={researchCompetitors}
          disabled={researching}
        >
          {researching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Search size={20} color="#fff" />
              <Text style={styles.buttonText}>Research Competitors</Text>
            </>
          )}
        </TouchableOpacity>

        {selectedDeals.size > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.insertButton]}
            onPress={insertSelectedDeals}
            disabled={inserting}
          >
            {inserting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Plus size={20} color="#fff" />
                <Text style={styles.buttonText}>Insert {selectedDeals.size} Selected</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {deals.length > 0 && (
        <View style={styles.dealsSection}>
          <View style={styles.dealsHeader}>
            <Text style={styles.sectionTitle}>Found Deals ({deals.length})</Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={toggleSelectAll}
            >
              {selectedDeals.size === deals.length ? (
                <CheckSquare size={20} color="#6366f1" />
              ) : (
                <Square size={20} color="#64748b" />
              )}
              <Text style={styles.selectAllText}>
                {selectedDeals.size === deals.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {selectedDeals.size > 0 && (
            <Text style={styles.selectionInfo}>
              {selectedDeals.size} deal{selectedDeals.size !== 1 ? 's' : ''} selected
            </Text>
          )}

          {deals.some(deal => deal.isDuplicate) && (
            <View style={styles.duplicateOption}>
              <Text style={styles.duplicateOptionText}>Include duplicates in insertion:</Text>
              <TouchableOpacity
                style={[styles.toggleButton, includeDuplicates && styles.toggleButtonActive]}
                onPress={() => setIncludeDuplicates(!includeDuplicates)}
              >
                <Text style={[styles.toggleText, includeDuplicates && styles.toggleTextActive]}>
                  {includeDuplicates ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.dealsList}>
            {deals.map(deal => (
              <TouchableOpacity
                key={deal.id}
                style={[
                  styles.dealCard,
                  selectedDeals.has(deal.id!) && styles.dealCardSelected
                ]}
                onPress={() => toggleDealSelection(deal.id!)}
              >
                <View style={styles.dealHeader}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleDealSelection(deal.id!)}
                  >
                    {selectedDeals.has(deal.id!) ? (
                      <CheckSquare size={20} color="#6366f1" />
                    ) : (
                      <Square size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.dealContent}>
                    <Text style={styles.dealTitle}>{deal.title}</Text>
                    <Text style={styles.dealPrice}>
                      {formatPrice(deal.price)} <Text style={styles.originalPrice}>{formatPrice(deal.original_price)}</Text>
                      <Text style={styles.discount}> ({deal.discount_percentage}% off)</Text>
                    </Text>
                    <Text style={styles.dealStore}>{deal.store} via {deal.competitor}</Text>
                    <Text style={styles.dealUrl}>{deal.url}</Text>
                    {deal.images && deal.images.length > 0 && (
                      <View style={styles.imageContainer}>
                        <Text style={styles.imageCount}>{deal.images.length} image{deal.images.length !== 1 ? 's' : ''}</Text>
                      </View>
                    )}
                    {deal.isDuplicate && (
                      <View style={styles.duplicateBadge}>
                        <AlertTriangle size={14} color="#dc2626" />
                        <Text style={styles.duplicateText}>
                          {deal.duplicateReason} ({deal.similarityScore?.toFixed(0)}% similar)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Information Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Info size={20} color="#6366f1" />
          <Text style={styles.infoTitle}>How Deals Are Stored & Audited</Text>
        </View>
        <Text style={styles.infoText}>
          • <Text style={styles.boldText}>Duplication Check:</Text> System automatically detects URL and title duplicates
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.boldText}>Selective Insertion:</Text> Choose which deals to insert, duplicates are highlighted
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.boldText}>Audit Trail:</Text> All insertions are logged in Admin → Audit Log
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.boldText}>Created By:</Text> Choose any admin, moderator, or superadmin user
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  competitorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  competitorItem: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  competitorText: {
    color: '#6366f1',
    fontWeight: '500',
  },
  storeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  storeItem: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  storeText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  researchButton: {
    backgroundColor: '#6366f1',
    flex: 1,
  },
  insertButton: {
    backgroundColor: '#10b981',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dealsSection: {
    flex: 1,
  },
  dealsList: {
    maxHeight: 400,
  },
  dealCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  dealPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
    fontWeight: '400',
  },
  discount: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },
  dealStore: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  dealStatus: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  dealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  selectionInfo: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 10,
  },
  dealCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f4ff',
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  dealContent: {
    flex: 1,
  },
  dealUrl: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
    color: '#374151',
  },
  duplicateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    gap: 4,
  },
  duplicateText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  duplicateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  userSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  userSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  userDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    maxHeight: 200,
  },
  userOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userOptionSelected: {
    backgroundColor: '#f0f4ff',
  },
  userOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  userOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  imageContainer: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  imageCount: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
});
