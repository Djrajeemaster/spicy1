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
import { Plus, Search, Edit, Trash2, Store, Check, X, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storeService } from '@/services/storeService';
import { Database } from '@/types/database';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreManagementProps {
  onRefresh?: () => void;
}

export const StoreManagement: React.FC<StoreManagementProps> = ({ onRefresh }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    website_url: '',
    logo_url: '',
    description: '',
    verified: false,
  });

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await storeService.getStores();
      if (error) {
        console.error('Error loading stores:', error);
        Alert.alert('Error', 'Failed to load stores');
      } else {
        setStores(data || []);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      Alert.alert('Error', 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Store name is required');
      return;
    }

    try {
      const { data, error } = await storeService.createStore({
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        website_url: formData.website_url.trim() || null,
        logo_url: formData.logo_url.trim() || null,
        description: formData.description.trim() || null,
        verified: formData.verified,
      });

      if (error) {
        Alert.alert('Error', 'Failed to create store');
        return;
      }

      Alert.alert('Success', 'Store created successfully');
      setShowAddModal(false);
      resetForm();
      loadStores();
      onRefresh?.();
    } catch (error) {
      console.error('Error creating store:', error);
      Alert.alert('Error', 'Failed to create store');
    }
  };

  const handleUpdateStore = async () => {
    if (!editingStore || !formData.name.trim()) {
      Alert.alert('Error', 'Store name is required');
      return;
    }

    try {
      const { data, error } = await storeService.updateStore(editingStore.id, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        website_url: formData.website_url.trim() || null,
        logo_url: formData.logo_url.trim() || null,
        description: formData.description.trim() || null,
        verified: formData.verified,
      });

      if (error) {
        Alert.alert('Error', 'Failed to update store');
        return;
      }

      Alert.alert('Success', 'Store updated successfully');
      setEditingStore(null);
      resetForm();
      loadStores();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating store:', error);
      Alert.alert('Error', 'Failed to update store');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    Alert.alert(
      'Delete Store',
      'Are you sure you want to delete this store? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await storeService.deleteStore(storeId);
              if (error) {
                Alert.alert('Error', 'Failed to delete store');
                return;
              }
              Alert.alert('Success', 'Store deleted successfully');
              loadStores();
              onRefresh?.();
            } catch (error) {
              console.error('Error deleting store:', error);
              Alert.alert('Error', 'Failed to delete store');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      website_url: '',
      logo_url: '',
      description: '',
      verified: false,
    });
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      slug: store.slug,
      website_url: store.website_url || '',
      logo_url: store.logo_url || '',
      description: store.description || '',
      verified: store.verified || false,
    });
    setShowAddModal(true);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStoreItem = ({ item }: { item: Store }) => (
    <View style={styles.storeCard}>
      <View style={styles.storeHeader}>
        <View style={styles.storeInfo}>
          <View style={styles.storeTitleRow}>
            <Text style={styles.storeName}>{item.name}</Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Check size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text style={styles.storeSlug}>@{item.slug}</Text>
          {item.website_url && (
            <TouchableOpacity style={styles.websiteLink}>
              <ExternalLink size={14} color="#6366f1" />
              <Text style={styles.websiteText}>{item.website_url}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.storeActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Edit size={16} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteStore(item.id)}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.storeFooter}>
        <Text style={styles.createdDate}>
          Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
        </Text>
      </View>
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowAddModal(false);
              setEditingStore(null);
              resetForm();
            }}
          >
            <X size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingStore ? 'Edit Store' : 'Add New Store'}
          </Text>
          <TouchableOpacity
            onPress={editingStore ? handleUpdateStore : handleAddStore}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Store Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter store name"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Slug</Text>
            <TextInput
              style={styles.input}
              value={formData.slug}
              onChangeText={(text) => setFormData({ ...formData, slug: text })}
              placeholder="auto-generated-from-name"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Website URL</Text>
            <TextInput
              style={styles.input}
              value={formData.website_url}
              onChangeText={(text) => setFormData({ ...formData, website_url: text })}
              placeholder="https://example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Logo URL</Text>
            <TextInput
              style={styles.input}
              value={formData.logo_url}
              onChangeText={(text) => setFormData({ ...formData, logo_url: text })}
              placeholder="https://example.com/logo.png"
              placeholderTextColor="#94a3b8"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Store description"
              placeholderTextColor="#94a3b8"
              multiline
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.label}>Verified Store</Text>
            <Switch
              value={formData.verified}
              onValueChange={(value) => setFormData({ ...formData, verified: value })}
              trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
              thumbColor={formData.verified ? '#FFFFFF' : '#94a3b8'}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading stores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Store size={24} color="#1e293b" />
          <Text style={styles.title}>Store Management</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      <FlatList
        data={filteredStores}
        keyExtractor={(item) => item.id}
        renderItem={renderStoreItem}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {renderModal()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  verifiedBadge: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeSlug: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  websiteText: {
    fontSize: 14,
    color: '#6366f1',
  },
  storeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  storeFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  createdDate: {
    fontSize: 12,
    color: '#64748b',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
});