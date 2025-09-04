import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Modal, TextInput, Alert } from 'react-native';
import { AdminCategory } from '@/hooks/useAdminData';
import { Plus, Trash2, X } from 'lucide-react-native';
import { categoryService } from '@/services/categoryService';

interface CategoryManagementProps {
  categories: AdminCategory[];
  onToggleCategory: (categoryId: string) => void;
  onAddNewCategory: () => void;
  onRefresh: () => void;
}

const CategoryItem: React.FC<{ category: AdminCategory; onToggleCategory: (categoryId: string) => void; onDelete: (categoryId: string) => void }> = ({ category, onToggleCategory, onDelete }) => (
  <View style={categoryStyles.categoryCard}>
    <View style={categoryStyles.categoryInfo}>
      <Text style={categoryStyles.categoryEmoji}>{category.emoji}</Text>
      <View>
        <Text style={categoryStyles.categoryName}>{category.name}</Text>
        <Text style={categoryStyles.categoryStats}>{category.deal_count || 0} deals</Text>
      </View>
    </View>
    <View style={categoryStyles.categoryActions}>
      <TouchableOpacity onPress={() => onDelete(category.id)} style={categoryStyles.deleteButton}>
        <Trash2 size={16} color="#ef4444" />
      </TouchableOpacity>
      <Switch
        value={category.is_active || false}
        onValueChange={() => onToggleCategory(category.id)}
        trackColor={{ false: '#E5E7EB', true: '#10b981' }}
        thumbColor={category.is_active ? '#FFFFFF' : '#F3F4F6'}
      />
    </View>
  </View>
);

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ categories, onToggleCategory, onAddNewCategory, onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('📦');
  const [loading, setLoading] = useState(false);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await categoryService.createCategory({
        name: categoryName.trim(),
        emoji: categoryEmoji,
        is_active: true,
      });

      if (error) {
        Alert.alert('Error', 'Failed to create category');
      } else {
        Alert.alert('Success', 'Category created successfully');
        setCategoryName('');
        setCategoryEmoji('📦');
        setShowModal(false);
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await categoryService.deleteCategory(categoryId);
            if (error) {
              Alert.alert('Error', 'Failed to delete category');
            } else {
              Alert.alert('Success', 'Category deleted successfully');
              onRefresh();
            }
          }
        }
      ]
    );
  };

  return (
    <View style={categoryStyles.container}>
      <View style={categoryStyles.header}>
        <Text style={categoryStyles.headerTitle}>Category Management</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={categoryStyles.addButton}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        renderItem={({ item }) => <CategoryItem category={item} onToggleCategory={onToggleCategory} onDelete={handleDeleteCategory} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={categoryStyles.listContent}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={categoryStyles.modalOverlay}>
          <View style={categoryStyles.modalContent}>
            <View style={categoryStyles.modalHeader}>
              <Text style={categoryStyles.modalTitle}>Add New Category</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={categoryStyles.inputGroup}>
              <Text style={categoryStyles.inputLabel}>Category Name</Text>
              <TextInput
                style={categoryStyles.textInput}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="Enter category name"
              />
            </View>
            
            <View style={categoryStyles.inputGroup}>
              <Text style={categoryStyles.inputLabel}>Emoji</Text>
              <TextInput
                style={categoryStyles.textInput}
                value={categoryEmoji}
                onChangeText={setCategoryEmoji}
                placeholder="📦"
              />
            </View>
            
            <View style={categoryStyles.modalActions}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={categoryStyles.cancelButton}>
                <Text style={categoryStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateCategory} style={categoryStyles.createButton} disabled={loading}>
                <Text style={categoryStyles.createButtonText}>{loading ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});