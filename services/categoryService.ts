
import { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

class CategoryService {
  async getCategories(): Promise<{ data: Category[]; error: any }> {
    try {
      const response = await fetch('http://localhost:3000/api/categories?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { data: [], error };
    }
  }

  async getAllCategories(): Promise<{ data: Category[]; error: any }> {
    try {
      const response = await fetch('http://localhost:3000/api/categories');
      if (!response.ok) throw new Error('Failed to fetch all categories');
      const data = await response.json();
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching all categories:', error);
      return { data: [], error };
    }
  }

  async getCategoryById(id: string): Promise<{ data: Category | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/categories/${id}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching category:', error);
      return { data: null, error };
    }
  }

  async createCategory(categoryData: CategoryInsert): Promise<{ data: Category | null; error: any }> {
    try {
      const response = await fetch('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error('Failed to create category');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error creating category:', error);
      return { data: null, error };
    }
  }

  async updateCategory(id: string, updates: CategoryUpdate): Promise<{ data: Category | null; error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update category');
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating category:', error);
      return { data: null, error };
    }
  }

  async deleteCategory(id: string): Promise<{ error: any }> {
    try {
      const response = await fetch(`http://localhost:3000/api/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return { error: null };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { error };
    }
  }
}

export const categoryService = new CategoryService();