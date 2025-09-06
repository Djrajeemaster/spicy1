import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Search, Smile, Heart, ThumbsUp, Star, Zap } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const theme = {
  primary: '#059669',
  primaryLight: '#10B981',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#1E293B',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
};

interface EmojiGifPickerProps {
  visible: boolean;
  type: 'emoji' | 'gif';
  onSelect: (item: string) => void;
  onClose: () => void;
}

// Comprehensive emoji categories with better organization
const EMOJI_CATEGORIES = {
  recent: {
    name: 'Recently Used',
    icon: '🕒',
    emojis: ['😀', '😂', '❤️', '👍', '🔥', '💯', '🎉', '👏'],
  },
  smileys: {
    name: 'Smileys & People',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '�', '�', '�', '😴', '🤤', '�',
      '😵', '�', '�', '�', '�', '😎', '�', '�', '�', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
    ],
  },
  animals: {
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵',
      '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
      '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎',
      '🌸', '💐', '🌹', '�', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️',
    ],
  },
  food: {
    name: 'Food & Drink',
    icon: '🍎',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
      '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
      '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔',
      '🍟', '🍕', '�', '🥙', '🧆', '�', '�', '🫔', '🥗', '🥘', '🫕', '🥫', '�', '🍜', '🍲', '🍛',
    ],
  },
  activities: {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿',
      '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣',
      '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '�️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '�', '🎭',
    ],
  },
  objects: {
    name: 'Objects',
    icon: '💎',
    emojis: [
      '💎', '🔔', '🎵', '🎶', '🎤', '🎧', '📻', '🎷', '🪗', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '🪘',
      '📱', '📞', '☎️', '📟', '📠', '🔋', '🔌', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿',
      '📀', '🧮', '🎥', '🎞️', '📽️', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦',
      '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️',
    ],
  },
  symbols: {
    name: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈',
      '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
      '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️',
    ],
  },
};

// GIF categories with sample data (replace with actual GIF service)
const GIF_CATEGORIES = [
  {
    name: 'Trending',
    gifs: [
      { id: '1', url: 'https://media.giphy.com/media/example1/giphy.gif', tags: ['trending', 'popular'] },
      { id: '2', url: 'https://media.giphy.com/media/example2/giphy.gif', tags: ['trending', 'viral'] },
    ],
  },
  {
    name: 'Reactions',
    gifs: [
      { id: '3', url: 'https://media.giphy.com/media/example3/giphy.gif', tags: ['reaction', 'wow'] },
      { id: '4', url: 'https://media.giphy.com/media/example4/giphy.gif', tags: ['reaction', 'laugh'] },
    ],
  },
  {
    name: 'Love',
    gifs: [
      { id: '5', url: 'https://media.giphy.com/media/example5/giphy.gif', tags: ['love', 'heart'] },
      { id: '6', url: 'https://media.giphy.com/media/example6/giphy.gif', tags: ['love', 'kiss'] },
    ],
  },
];

const EmojiGifPicker: React.FC<EmojiGifPickerProps> = ({ visible, type, onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(type === 'emoji' ? 'recent' : 'Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(['😀', '😂', '❤️', '👍', '🔥', '💯']);
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (type === 'emoji') {
      if (searchQuery) {
        // Filter emojis based on search
        const filtered = Object.values(EMOJI_CATEGORIES)
          .flatMap(category => category.emojis)
          .filter(emoji => {
            // Simple emoji search - in real app, you'd use emoji metadata
            return searchQuery.length < 2 || Math.random() > 0.7; // Mock search
          });
        setFilteredItems(filtered);
      } else {
        setFilteredItems(EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES]?.emojis || []);
      }
    } else {
      // Handle GIF filtering
      const categoryData = GIF_CATEGORIES.find(cat => cat.name === activeCategory);
      setFilteredItems(categoryData?.gifs || []);
    }
  }, [activeCategory, searchQuery, type]);

  const handleEmojiSelect = (emoji: string) => {
    // Add to recent emojis
    setRecentEmojis(prev => {
      const newRecent = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 20);
      return newRecent;
    });
    onSelect(emoji);
  };

  const handleGifSelect = (gif: any) => {
    const gifUrl = typeof gif === 'string' ? gif : gif.url;
    onSelect(gifUrl);
  };

  const renderEmojiItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={[styles.emojiItem, { 
        backgroundColor: 'transparent',
      }]}
      onPress={() => handleEmojiSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{item}</Text>
    </TouchableOpacity>
  );

  const renderGifItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.gifItem}
      onPress={() => handleGifSelect(item)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: typeof item === 'string' ? item : item.url }} 
        style={styles.gifImage} 
        resizeMode="cover" 
      />
    </TouchableOpacity>
  );

  const renderCategoryButton = (category: string, icon?: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        activeCategory === category && styles.activeCategoryButton
      ]}
      onPress={() => setActiveCategory(category)}
    >
      {type === 'emoji' ? (
        <Text style={styles.categoryIcon}>{icon}</Text>
      ) : (
        <Text style={[
          styles.categoryText,
          activeCategory === category && styles.activeCategoryText
        ]}>
          {category}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${type}s...`}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={type === 'emoji' 
            ? Object.entries(EMOJI_CATEGORIES).map(([key, value]) => ({ key, ...value }))
            : GIF_CATEGORIES.map(cat => ({ key: cat.name, name: cat.name }))
          }
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => 
            renderCategoryButton(item.key, type === 'emoji' ? (item as any).icon : undefined)
          }
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <View style={styles.content}>
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => {
            if (type === 'emoji') {
              return typeof item === 'string' ? `emoji-${item}-${index}` : `emoji-${index}`;
            } else {
              return typeof item === 'object' && item && (item as any).id ? `gif-${(item as any).id}` : `gif-${index}`;
            }
          }}
          renderItem={type === 'emoji' ? renderEmojiItem : renderGifItem}
          numColumns={type === 'emoji' ? 8 : 2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.itemsList}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: theme.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.textMuted,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  categoriesList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: theme.surface,
    minWidth: 60,
    alignItems: 'center',
  },
  activeCategoryButton: {
    backgroundColor: theme.primary,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: 12,
    color: theme.textMuted,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: theme.background,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  itemsList: {
    padding: 8,
  },
  emojiItem: {
    width: (width - 64) / 8,
    height: (width - 64) / 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 2,
    backgroundColor: 'transparent',
  },
  emoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  gifItem: {
    width: (width - 48) / 2,
    height: 140,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gifImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});

export default EmojiGifPicker;
