
import { Database } from '@/types/database';
import { apiClient } from '@/utils/apiClient';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

class CategoryService {
  async getCategories(): Promise<{ data: Category[]; error: any }> {
    try {
      const data = await apiClient.get('/categories?is_active=true') as Category[];
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { data: [], error };
    }
  }

  async getAllCategories(): Promise<{ data: Category[]; error: any }> {
    try {
      const data = await apiClient.get('/categories') as Category[];
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all categories:', error);
      return { data: [], error };
    }
  }

  async getCategoryById(id: string): Promise<{ data: Category | null; error: any }> {
    try {
      const data = await apiClient.get(`/categories/${id}`) as Category;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching category:', error);
      return { data: null, error };
    }
  }

  async createCategory(categoryData: CategoryInsert): Promise<{ data: Category | null; error: any }> {
    try {
      const data = await apiClient.post('/categories', categoryData) as Category;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating category:', error);
      return { data: null, error };
    }
  }

  async updateCategory(id: string, updates: CategoryUpdate): Promise<{ data: Category | null; error: any }> {
    try {
      const data = await apiClient.put(`/categories/${id}`, updates) as Category;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating category:', error);
      return { data: null, error };
    }
  }

  async deleteCategory(id: string): Promise<{ error: any }> {
    try {
      await apiClient.delete(`/categories/${id}`);
      return { error: null };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { error };
    }
  }
}

export const categoryService = new CategoryService();
