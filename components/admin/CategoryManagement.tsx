import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch } from 'react-native';
import { AdminCategory } from '@/hooks/useAdminData';
import { Plus } from 'lucide-react-native';

interface CategoryManagementProps {
  categories: AdminCategory[];
  onToggleCategory: (categoryId: string) => void;
  onAddNewCategory: () => void;
}

const CategoryItem: React.FC<{ category: AdminCategory; onToggleCategory: (categoryId: string) => void }> = ({ category, onToggleCategory }) => (
  <View style={categoryStyles.categoryCard}>
    <View style={categoryStyles.categoryInfo}>
      <Text style={categoryStyles.categoryEmoji}>{category.emoji}</Text>
      <View>
        <Text style={categoryStyles.categoryName}>{category.name}</Text>
        <Text style={categoryStyles.categoryStats}>{category.deal_count || 0} deals</Text>
      </View>
    </View>
    <Switch
      value={category.is_active || false}
      onValueChange={() => onToggleCategory(category.id)}
      trackColor={{ false: '#E5E7EB', true: '#10b981' }}
      thumbColor={category.is_active ? '#FFFFFF' : '#F3F4F6'}
    />
  </View>
);

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ categories, onToggleCategory, onAddNewCategory }) => {
  return (
    <View style={categoryStyles.container}>
      <View style={categoryStyles.header}>
        <Text style={categoryStyles.headerTitle}>Category Management</Text>
        <TouchableOpacity onPress={onAddNewCategory} style={categoryStyles.addButton}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        renderItem={({ item }) => <CategoryItem category={item} onToggleCategory={onToggleCategory} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={categoryStyles.listContent}
      />
    </View>
  );
};

const categoryStyles = StyleSheet.create({
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
  categoryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  categoryStats: {
    fontSize: 13,
    color: '#64748b',
  },
});
