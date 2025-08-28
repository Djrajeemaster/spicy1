import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

class CategoryService {
  async getCategories(): Promise<{ data: Category[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { data: [], error };
    }
  }

  async getAllCategories(): Promise<{ data: Category[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all categories:', error);
      return { data: [], error };
    }
  }

  async getCategoryById(id: string): Promise<{ data: Category | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching category:', error);
      return { data: null, error };
    }
  }

  async createCategory(categoryData: CategoryInsert): Promise<{ data: Category | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating category:', error);
      return { data: null, error };
    }
  }

  async updateCategory(id: string, updates: CategoryUpdate): Promise<{ data: Category | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating category:', error);
      return { data: null, error };
    }
  }

  async deleteCategory(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { error };
    }
  }
}

export const categoryService = new CategoryService();