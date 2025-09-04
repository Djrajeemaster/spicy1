import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Image, Alert } from 'react-native';
import { AdminBanner } from '@/hooks/useAdminData';
import { Plus, Trash2 } from 'lucide-react-native';

interface BannerManagementProps {
  banners: AdminBanner[];
  onToggleBanner: (bannerId: string) => void;
  onAddNewBanner: () => void;
  onDeleteBanner?: (bannerId: string) => void;
}

const BannerItem: React.FC<{ banner: AdminBanner; onToggleBanner: (bannerId: string) => void; onDeleteBanner?: (bannerId: string) => void }> = ({ banner, onToggleBanner, onDeleteBanner }) => (
  <View style={bannerStyles.bannerCard}>
    <Image source={{ uri: banner.image_url || 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=400' }} style={bannerStyles.bannerImage} />
    <View style={bannerStyles.bannerInfo}>
      <Text style={bannerStyles.bannerTitle}>{banner.title}</Text>
      <Text style={bannerStyles.bannerDescription}>{banner.description}</Text>
      <Text style={bannerStyles.bannerPriority}>Priority: {banner.priority}</Text>
    </View>
    <View style={bannerStyles.actions}>
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
            Alert.alert(
              'Delete Banner',
              `Are you sure you want to delete "${banner.title}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDeleteBanner(banner.id) }
              ]
            );
          }}
        >
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export const BannerManagement: React.FC<BannerManagementProps> = ({ banners, onToggleBanner, onAddNewBanner, onDeleteBanner }) => {
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
        renderItem={({ item }) => <BannerItem banner={item} onToggleBanner={onToggleBanner} onDeleteBanner={onDeleteBanner} />}
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'cover',
  },
  bannerInfo: {
    flex: 1,
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  bannerPriority: {
    fontSize: 12,
    color: '#94a3b8',
  },
});