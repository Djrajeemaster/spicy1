import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Image, Alert, Dimensions, Platform } from 'react-native';
import { AdminBanner } from '@/hooks/useAdminData';
import { Plus, Trash2, Edit3 } from 'lucide-react-native';

interface BannerManagementProps {
  banners: AdminBanner[];
  onToggleBanner: (bannerId: string) => void;
  onAddNewBanner: () => void;
  onEditBanner?: (bannerId: string) => void;
  onDeleteBanner?: (bannerId: string) => void;
}

const BannerItem: React.FC<{
  banner: AdminBanner;
  onToggleBanner: (bannerId: string) => void;
  onEditBanner?: (bannerId: string) => void;
  onDeleteBanner?: (bannerId: string) => void
}> = ({ banner, onToggleBanner, onEditBanner, onDeleteBanner }) => (
  <View style={bannerStyles.bannerCard}>
    <View style={bannerStyles.bannerContent}>
      <Image
        source={{ uri: banner.image_url || 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=400' }}
        style={bannerStyles.bannerImage}
      />
      <View style={bannerStyles.bannerInfo}>
        <Text style={bannerStyles.bannerTitle}>{banner.title}</Text>
        <Text style={bannerStyles.bannerDescription} numberOfLines={2}>{banner.description}</Text>
        <Text style={bannerStyles.bannerPriority}>Priority: {banner.priority}</Text>
      </View>
    </View>
    <View style={bannerStyles.bannerActions}>
      <Text style={bannerStyles.statusText}>Status: {banner.is_active ? 'Active' : 'Inactive'}</Text>
      <View style={bannerStyles.actions}>
        {onEditBanner && (
          <TouchableOpacity
            style={bannerStyles.editButton}
            onPress={() => {
              onEditBanner(banner.id);
            }}
          >
            <Edit3 size={16} color="#3b82f6" />
          </TouchableOpacity>
        )}
        <Switch
          value={banner.is_active}
          onValueChange={() => onToggleBanner(banner.id)}
          trackColor={{ false: '#E5E7EB', true: '#10b981' }}
          thumbColor={banner.is_active ? '#FFFFFF' : '#F3F4F6'}
        />
        {onDeleteBanner && (
          <TouchableOpacity
            style={bannerStyles.deleteButton}
            onPress={() => {
              // Use native confirm on web (synchronous) and Alert on native platforms
              if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
                const ok = window.confirm(`Are you sure you want to delete "${banner.title}"?`);
                if (ok) {
                  try {
                    onDeleteBanner(banner.id);
                  } catch (error) {
                    // swallow - parent handles errors
                  }
                }
              } else {
                Alert.alert(
                  'Delete Banner',
                  `Are you sure you want to delete "${banner.title}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'OK', style: 'destructive', onPress: () => { try { onDeleteBanner(banner.id); } catch {} } }
                  ]
                );
              }
            }}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  </View>
);

export const BannerManagement: React.FC<BannerManagementProps> = ({
  banners,
  onToggleBanner,
  onAddNewBanner,
  onEditBanner,
  onDeleteBanner
}) => {
  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.header}>
        <Text style={bannerStyles.headerTitle}>Banner Management</Text>
        <TouchableOpacity onPress={onAddNewBanner} style={bannerStyles.addButton}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={banners}
        renderItem={({ item }) => (
          <BannerItem
            banner={item}
            onToggleBanner={onToggleBanner}
            onEditBanner={onEditBanner}
            onDeleteBanner={onDeleteBanner}
          />
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={bannerStyles.listContent}
      />
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Dimensions.get('window').width < 768 ? 12 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: Dimensions.get('window').width < 768 ? 20 : 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#10b981',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    padding: Dimensions.get('window').width < 768 ? 12 : 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerImage: {
    width: Dimensions.get('window').width < 768 ? 50 : 60,
    height: Dimensions.get('window').width < 768 ? 50 : 60,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'cover',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerActions: {
    flexDirection: Dimensions.get('window').width < 768 ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: Dimensions.get('window').width < 768 ? 'flex-start' : 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Dimensions.get('window').width < 768 ? 8 : 0,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: Dimensions.get('window').width < 768 ? 14 : 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: Dimensions.get('window').width < 768 ? 12 : 13,
    color: '#64748b',
    marginBottom: 4,
  },
  bannerPriority: {
    fontSize: Dimensions.get('window').width < 768 ? 11 : 12,
    color: '#94a3b8',
  },
  statusText: {
    fontSize: Dimensions.get('window').width < 768 ? 13 : 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: Dimensions.get('window').width < 768 ? 4 : 0,
  },
});