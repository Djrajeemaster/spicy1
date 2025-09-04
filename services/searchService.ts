import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/utils/apiClient';

export interface SearchHistory {
  query: string;
  timestamp: number;
  results: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'history' | 'popular' | 'category' | 'store';
  count?: number;
}

class SearchService {
  private readonly SEARCH_HISTORY_KEY = 'search_history';
  private readonly MAX_HISTORY_ITEMS = 20;

  async getSearchHistory(): Promise<SearchHistory[]> {
    try {
      const history = await AsyncStorage.getItem(this.SEARCH_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  }

  async addToSearchHistory(query: string, results: number): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      const newItem: SearchHistory = {
        query: query.trim(),
        timestamp: Date.now(),
        results,
      };

      // Remove duplicate if exists
      const filtered = history.filter(item => item.query !== newItem.query);
      
      // Add new item at beginning
      const updated = [newItem, ...filtered].slice(0, this.MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    if (query.length < 2) return suggestions;

    // Get history suggestions
    const history = await this.getSearchHistory();
    const historySuggestions = history
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(item => ({
        text: item.query,
        type: 'history' as const,
        count: item.results,
      }));

    // Popular searches (mock data - replace with API)
    const popularSuggestions: SearchSuggestion[] = [
      { text: 'electronics deals', type: 'popular', count: 1250 },
      { text: 'food delivery', type: 'popular', count: 890 },
      { text: 'fashion sale', type: 'popular', count: 670 },
    ].filter(item => item.text.toLowerCase().includes(query.toLowerCase()));

    return [...historySuggestions, ...popularSuggestions].slice(0, 8);
  }
}

export const searchService = new SearchService();
