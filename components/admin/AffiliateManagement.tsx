import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Plus, Search, Edit, Trash2, Globe, DollarSign, Check, X, Download, Upload, BarChart3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { affiliateService, AffiliateSettings, AffiliateSettingsInsert, AffiliateStats } from '@/services/affiliateService';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
];

const POPULAR_STORES = [
  'Amazon', 'Walmart', 'Target', 'Best Buy', 'eBay', 
  'Costco', 'Home Depot', 'Lowes', 'Macys', 'Kohls',
  'Nordstrom', 'Sephora', 'Ulta', 'Nike', 'Adidas'
];

interface AffiliateManagementProps {
  onRefresh?: () => void;
}

export const AffiliateManagement: React.FC<AffiliateManagementProps> = ({ onRefresh }) => {
  const [affiliateSettings, setAffiliateSettings] = useState<AffiliateSettings[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  // Form state
  const [formData, setFormData] = useState<AffiliateSettingsInsert>({
    store_name: '',
    country_code: 'US',
    affiliate_id: '',
    affiliate_tag: '',
    commission_rate: 0,
    tracking_template: '',
    notes: '',
    is_active: true,
  });

  // Filters
  const [filters, setFilters] = useState({
    store_name: '',
    country_code: '',
    is_active: undefined as boolean | undefined,
  });

  useEffect(() => {
    loadAffiliateSettings();
    loadStats();
  }, [filters]);

  const loadAffiliateSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await affiliateService.getAffiliateSettings({
        ...filters,
        search: searchQuery,
      });
      
      if (error) {
        console.error('Error loading affiliate settings:', error);
        Alert.alert('Error', 'Failed to load affiliate settings');
      } else {
        setAffiliateSettings(data || []);
      }
    } catch (error) {
      console.error('Error loading affiliate settings:', error);
      Alert.alert('Error', 'Failed to load affiliate settings');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await affiliateService.getAffiliateStats();
      if (error) {
        console.error('Error loading affiliate stats:', error);
      } else {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading affiliate stats:', error);
    }
  };

  const handleAddAffiliate = async () => {
    if (!formData.store_name.trim()) {
      Alert.alert('Error', 'Store name is required');
      return;
    }

    try {
      const { data, error } = await affiliateService.createAffiliateSettings(formData);

      if (error) {
        Alert.alert('Error', 'Failed to create affiliate setting');
        return;
      }

      Alert.alert('Success', 'Affiliate setting created successfully');
      setShowAddModal(false);
      resetForm();
      loadAffiliateSettings();
      loadStats();
      onRefresh?.();
    } catch (error) {
      console.error('Error creating affiliate setting:', error);
      Alert.alert('Error', 'Failed to create affiliate setting');
    }
  };

  const handleUpdateAffiliate = async () => {
    if (!editingAffiliate || !formData.store_name.trim()) {
      Alert.alert('Error', 'Store name is required');
      return;
    }

    try {
      const { data, error } = await affiliateService.updateAffiliateSettings(editingAffiliate.id, formData);

      if (error) {
        Alert.alert('Error', 'Failed to update affiliate setting');
        return;
      }

      Alert.alert('Success', 'Affiliate setting updated successfully');
      setEditingAffiliate(null);
      resetForm();
      loadAffiliateSettings();
      loadStats();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating affiliate setting:', error);
      Alert.alert('Error', 'Failed to update affiliate setting');
    }
  };

  const handleDeleteAffiliate = (affiliateId: string, storeName: string, countryCode: string) => {
    Alert.alert(
      'Delete Affiliate Setting',
      `Are you sure you want to delete the affiliate setting for ${storeName} (${countryCode})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await affiliateService.deleteAffiliateSettings(affiliateId);
              if (error) {
                Alert.alert('Error', 'Failed to delete affiliate setting');
              } else {
                Alert.alert('Success', 'Affiliate setting deleted successfully');
                loadAffiliateSettings();
                loadStats();
                onRefresh?.();
              }
            } catch (error) {
              console.error('Error deleting affiliate setting:', error);
              Alert.alert('Error', 'Failed to delete affiliate setting');
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (affiliateId: string, currentStatus: boolean) => {
    try {
      const { error } = await affiliateService.toggleAffiliateStatus(affiliateId, !currentStatus);
      if (error) {
        Alert.alert('Error', 'Failed to update affiliate status');
      } else {
        loadAffiliateSettings();
        loadStats();
      }
    } catch (error) {
      console.error('Error toggling affiliate status:', error);
      Alert.alert('Error', 'Failed to update affiliate status');
    }
  };

  const handleExport = async () => {
    try {
      const { data, error, filename } = await affiliateService.exportAffiliateSettings();
      if (error) {
        Alert.alert('Error', 'Failed to export affiliate settings');
        return;
      }

      // For web, create download link
      if (typeof window !== 'undefined') {
        const blob = new Blob([data!], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename!;
        a.click();
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'Affiliate settings exported successfully');
      }
    } catch (error) {
      console.error('Error exporting affiliate settings:', error);
      Alert.alert('Error', 'Failed to export affiliate settings');
    }
  };

  const resetForm = () => {
    setFormData({
      store_name: '',
      country_code: 'US',
      affiliate_id: '',
      affiliate_tag: '',
      commission_rate: 0,
      tracking_template: '',
      notes: '',
      is_active: true,
    });
  };

  const openEditModal = (affiliate: AffiliateSettings) => {
    setEditingAffiliate(affiliate);
    setFormData({
      store_name: affiliate.store_name,
      country_code: affiliate.country_code,
      affiliate_id: affiliate.affiliate_id || '',
      affiliate_tag: affiliate.affiliate_tag || '',
      commission_rate: affiliate.commission_rate || 0,
      tracking_template: affiliate.tracking_template || '',
      notes: affiliate.notes || '',
      is_active: affiliate.is_active,
    });
    setShowAddModal(true);
  };

  const getCountryFlag = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country ? country.flag : '🌍';
  };

  const getCountryName = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  const filteredAffiliateSettings = affiliateSettings.filter(setting =>
    setting.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    setting.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading affiliate settings...</Text>
      </View>
    );
  }

  const renderAffiliateItem = ({ item }: { item: AffiliateSettings }) => (
    <View style={styles.affiliateCard}>
      <View style={styles.affiliateHeader}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.store_name}</Text>
          <View style={styles.countryBadge}>
            <Text style={styles.countryFlag}>{getCountryFlag(item.country_code)}</Text>
            <Text style={styles.countryCode}>{item.country_code}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleStatus(item.id, item.is_active)}
            trackColor={{ false: '#f1f5f9', true: '#dbeafe' }}
            thumbColor={item.is_active ? '#3b82f6' : '#94a3b8'}
          />
        </View>
      </View>

      <View style={styles.affiliateDetails}>
        {item.affiliate_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Affiliate ID:</Text>
            <Text style={styles.detailValue}>{item.affiliate_id}</Text>
          </View>
        )}
        {item.affiliate_tag && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Affiliate Tag:</Text>
            <Text style={styles.detailValue}>{item.affiliate_tag}</Text>
          </View>
        )}
        {item.commission_rate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Commission:</Text>
            <Text style={styles.detailValue}>{item.commission_rate}%</Text>
          </View>
        )}
        {item.notes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes:</Text>
            <Text style={styles.detailValue}>{item.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.affiliateActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Edit size={16} color="#3b82f6" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAffiliate(item.id, item.store_name, item.country_code)}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>📊 Affiliate Statistics</Text>
      
      {stats && (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_stores}</Text>
              <Text style={styles.statLabel}>Total Stores</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active_affiliates}</Text>
              <Text style={styles.statLabel}>Active Affiliates</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_countries}</Text>
              <Text style={styles.statLabel}>Countries</Text>
            </View>
          </View>

          <View style={styles.countryBreakdown}>
            <Text style={styles.subsectionTitle}>Stores by Country</Text>
            {Object.entries(stats.stores_by_country).map(([countryCode, count]) => (
              <View key={countryCode} style={styles.countryRow}>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryFlag}>{getCountryFlag(countryCode)}</Text>
                  <Text style={styles.countryName}>{getCountryName(countryCode)}</Text>
                </View>
                <Text style={styles.countryCount}>{count} stores</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'list' && styles.activeTab]}
            onPress={() => setActiveTab('list')}
          >
            <Globe size={20} color={activeTab === 'list' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
              Affiliate Settings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
          >
            <BarChart3 size={20} color={activeTab === 'stats' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
              Statistics
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'list' && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
              <Download size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {activeTab === 'stats' ? renderStatsTab() : (
        <>
          {/* Search and Filters */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by store name or notes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Affiliate Settings List */}
          <FlatList
            data={filteredAffiliateSettings}
            renderItem={renderAffiliateItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Globe size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Affiliate Settings</Text>
                <Text style={styles.emptySubtitle}>
                  Add your affiliate IDs and tags to start earning commissions from deals
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingAffiliate ? 'Edit Affiliate Setting' : 'Add Affiliate Setting'}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Store Name *</Text>
                <View style={styles.storeSelector}>
                  {POPULAR_STORES.map((store) => (
                    <TouchableOpacity
                      key={store}
                      style={[
                        styles.storeChip,
                        formData.store_name === store && styles.storeChipSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, store_name: store }))}
                    >
                      <Text style={[
                        styles.storeChipText,
                        formData.store_name === store && styles.storeChipTextSelected
                      ]}>
                        {store}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.formInput}
                  placeholder="Or enter custom store name"
                  value={formData.store_name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, store_name: text }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Country</Text>
                <View style={styles.countrySelector}>
                  {COUNTRIES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[
                        styles.countryChip,
                        formData.country_code === country.code && styles.countryChipSelected
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, country_code: country.code }))}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <Text style={[
                        styles.countryChipText,
                        formData.country_code === country.code && styles.countryChipTextSelected
                      ]}>
                        {country.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Affiliate ID</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Your affiliate/partner ID"
                  value={formData.affiliate_id || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, affiliate_id: text }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Affiliate Tag</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Your affiliate tag (for Amazon Associates)"
                  value={formData.affiliate_tag || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, affiliate_tag: text }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Commission Rate (%)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0.00"
                  value={formData.commission_rate?.toString() || ''}
                  onChangeText={(text) => setFormData(prev => ({ 
                    ...prev, 
                    commission_rate: parseFloat(text) || 0 
                  }))}
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tracking Template</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="URL template with {product_id}, {affiliate_tag}, {affiliate_id} placeholders"
                  value={formData.tracking_template || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, tracking_template: text }))}
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Additional notes about this affiliate program"
                  value={formData.notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.formLabel}>Active</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                    trackColor={{ false: '#f1f5f9', true: '#dbeafe' }}
                    thumbColor={formData.is_active ? '#3b82f6' : '#94a3b8'}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setEditingAffiliate(null);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingAffiliate ? handleUpdateAffiliate : handleAddAffiliate}
              >
                <Text style={styles.saveButtonText}>
                  {editingAffiliate ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#f1f5f9',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#6366f1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButton: {
    padding: 8,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1e293b',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  affiliateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  affiliateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 12,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  statusContainer: {
    alignItems: 'center',
  },
  affiliateDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  affiliateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#dbeafe',
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  statsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  countryBreakdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryName: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 8,
  },
  countryCount: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
    maxWidth: 500,
  },
  modalScroll: {
    maxHeight: 500,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  formGroup: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  storeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  storeChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  storeChipSelected: {
    backgroundColor: '#6366f1',
  },
  storeChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  storeChipTextSelected: {
    color: '#FFFFFF',
  },
  countrySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  countryChipSelected: {
    backgroundColor: '#6366f1',
  },
  countryChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 4,
  },
  countryChipTextSelected: {
    color: '#FFFFFF',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});