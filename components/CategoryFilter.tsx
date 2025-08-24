import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Category {
  id: string;
  name: string;
  emoji: string; // Add emoji property
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

// Remove the hardcoded categoryEmojis map as emojis will come from the database
// const categoryEmojis = {
//   all: '🔥',
//   electronics: '📱',
//   food: '🍕',
//   clothing: '👕',
//   home: '🏠',
//   automotive: '🚗',
//   services: '🔧',
// };

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryWrapper}
            onPress={() => onSelectCategory(category.id)}
          >
            {selectedCategory === category.id ? (
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.categoryButton}
              >
                <Text style={styles.categoryEmoji}>
                  {category.emoji} {/* Use emoji from category object */}
                </Text>
                <Text style={styles.categoryTextActive}>
                  {category.name}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.categoryButtonInactive}>
                <Text style={styles.categoryEmojiInactive}>
                  {category.emoji} {/* Use emoji from category object */}
                </Text>
                <Text style={styles.categoryText}>
                  {category.name}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categoryWrapper: {
    marginRight: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryButtonInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryEmojiInactive: {
    fontSize: 14,
    marginRight: 6,
    opacity: 0.7,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
