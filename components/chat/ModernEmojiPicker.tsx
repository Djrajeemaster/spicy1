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
  ScrollView,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ModernEmojiPickerProps {
  visible: boolean;
  type: 'emoji' | 'gif';
  onSelect: (item: string) => void;
  onClose: () => void;
}

// Professional emoji categories with better organization
const EMOJI_DATA = {
  recent: {
    name: 'Recent',
    icon: '🕒',
    emojis: ['😀', '😂', '❤️', '👍', '🔥', '💯', '🎉', '👏', '😍', '🥰', '😘', '🤗', '👌', '✨', '🙌', '💪'],
  },
  smileys: {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😔', '😪', '🤤', '😴',
      '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎',
    ],
  },
  people: {
    name: 'People',
    icon: '👍',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚',
      '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻',
      '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '👶', '🧒', '👦', '👧', '🧑',
      '👨', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮',
    ],
  },
  nature: {
    name: 'Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵',
      '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
      '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎',
      '🌸', '💐', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️',
    ],
  },
  food: {
    name: 'Food',
    icon: '🍎',
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
      '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
      '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔',
      '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛',
    ],
  },
  activities: {
    name: 'Activity',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿',
      '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣',
      '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭',
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

const GIF_CATEGORIES = [
  {
    name: 'Trending',
    gifs: [
      { id: '1', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', tags: ['trending'] },
      { id: '2', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', tags: ['trending'] },
      { id: '3', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', tags: ['trending'] },
      { id: '4', url: 'https://media.giphy.com/media/l1J9FiGxR61OcF2mI/giphy.gif', tags: ['happy'] },
    ],
  },
  {
    name: 'Happy',
    gifs: [
      { id: '5', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', tags: ['happy'] },
      { id: '6', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', tags: ['happy'] },
      { id: '7', url: 'https://media.giphy.com/media/26BRrSvJUa0crqw4E/giphy.gif', tags: ['happy'] },
      { id: '8', url: 'https://media.giphy.com/media/l1J9FiGxR61OcF2mI/giphy.gif', tags: ['happy'] },
    ],
  },
  {
    name: 'Reactions',
    gifs: [
      { id: '9', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', tags: ['reaction'] },
      { id: '10', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', tags: ['reaction'] },
      { id: '11', url: 'https://media.giphy.com/media/26BRrSvJUa0crqw4E/giphy.gif', tags: ['reaction'] },
      { id: '12', url: 'https://media.giphy.com/media/l1J9FiGxR61OcF2mI/giphy.gif', tags: ['reaction'] },
    ],
  },
];

const ModernEmojiPicker: React.FC<ModernEmojiPickerProps> = ({ visible, type, onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(type === 'emoji' ? 'recent' : 'Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(['😀', '😂', '❤️', '👍', '🔥', '💯', '🎉', '👏']);
  const slideAnim = React.useRef(new Animated.Value(350)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 350,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (type === 'emoji') {
      if (searchQuery) {
        const filtered = Object.values(EMOJI_DATA)
          .flatMap(category => category.emojis)
          .filter(emoji => Math.random() > 0.5); // Mock search
        setFilteredItems(filtered.slice(0, 40));
      } else {
        const categoryData = EMOJI_DATA[activeCategory as keyof typeof EMOJI_DATA];
        setFilteredItems(categoryData?.emojis || []);
      }
    } else {
      const categoryData = GIF_CATEGORIES.find(cat => cat.name === activeCategory);
      setFilteredItems(categoryData?.gifs || []);
    }
  }, [activeCategory, searchQuery, type]);

  const handleEmojiSelect = (emoji: string) => {
    setRecentEmojis(prev => {
      const newRecent = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 16);
      return newRecent;
    });
    // Update the recent category
    EMOJI_DATA.recent.emojis = recentEmojis;
    onSelect(emoji);
  };

  const handleGifSelect = (gif: any) => {
    onSelect(gif.url);
  };

  const renderEmojiItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.emojiItem}
      onPress={() => handleEmojiSelect(item)}
      activeOpacity={0.6}
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
        source={{ uri: item.url }} 
        style={styles.gifImage} 
        resizeMode="cover"
        onError={(e) => {}}
        onLoad={() => {}}
      />
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${type}s...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {type === 'emoji' 
            ? Object.entries(EMOJI_DATA).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryButton,
                    activeCategory === key && styles.activeCategoryButton
                  ]}
                  onPress={() => setActiveCategory(key)}
                >
                  <Text style={[
                    styles.categoryIcon,
                    activeCategory === key && styles.activeCategoryIcon
                  ]}>
                    {value.icon}
                  </Text>
                </TouchableOpacity>
              ))
            : GIF_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.categoryButton,
                    activeCategory === cat.name && styles.activeCategoryButton
                  ]}
                  onPress={() => setActiveCategory(cat.name)}
                >
                  <Text style={[
                    styles.categoryText,
                    activeCategory === cat.name && styles.activeCategoryText
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))
          }
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => {
            if (type === 'emoji') {
              return `emoji-${item}-${index}`;
            } else {
              return `gif-${(item as any).id || index}`;
            }
          }}
          renderItem={type === 'emoji' ? renderEmojiItem : renderGifItem}
          numColumns={type === 'emoji' ? 8 : 2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.itemsList}
          columnWrapperStyle={type === 'gif' ? styles.gifRow : undefined}
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
    height: 350,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '400',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
    minHeight: 52,
  },
  activeCategoryButton: {
    backgroundColor: '#059669',
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  categoryIcon: {
    fontSize: 24,
  },
  activeCategoryIcon: {
    fontSize: 24,
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emojiItem: {
    width: (width - 80) / 8,
    height: (width - 80) / 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 4,
    backgroundColor: 'transparent',
  },
  emoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  gifRow: {
    justifyContent: 'space-between',
  },
  gifItem: {
    width: (width - 56) / 2,
    height: 120,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
});

export default ModernEmojiPicker;
