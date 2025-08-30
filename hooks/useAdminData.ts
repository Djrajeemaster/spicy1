import { Alert, Platform } from 'react-native';
import { userService } from '@/services/userService';
import { activityService } from '@/services/activityService';
import { dealService, DealWithRelations } from '@/services/dealService';
import { useState, useCallback, useEffect } from 'react';
import { bannerService, Banner } from '@/services/bannerService';
import { categoryService } from '@/services/categoryService';
import { settingsService, SystemSetting } from '@/services/settingsService';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export interface AdminUser extends UserProfile {
  // redacted
}

export interface AdminCategory extends Category {
  // redacted
}

export interface AdminBanner extends Banner {
  // redacted
}

export interface AdminDeal extends DealWithRelations {
  // redacted
}

export interface AdminStats {
  totalUsers: number;
  activeDeals: number;
  pendingReviews: number;
  dailyActiveUsers: number;
}

export interface SystemSettings {
  auto_approve_verified?: boolean;
  require_moderation_new_deals?: boolean;
  allow_guest_posting?: boolean;
  max_daily_posts_per_user?: number;
  min_reputation_to_post?: number;
}

// Default system settings to ensure all properties are always defined
const defaultSystemSettings: SystemSettings = {
  auto_approve_verified: false,
  require_moderation_new_deals: true,
  allow_guest_posting: false,
  max_daily_posts_per_user: 5,
  min_reputation_to_post: 0,
};

export const useAdminData = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [pendingDeals, setPendingDeals] = useState<AdminDeal[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    activeDeals: 0,
    pendingReviews: 0,
    dailyActiveUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch all admin data on mount
  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    console.log('🔄 Starting admin data load...');
    
    try {
      // Fetch users
      console.log('📊 Fetching users...');
      const { data: usersData, error: usersError } = await userService.getAllUsers();
      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
      } else {
        console.log('✅ Users fetched successfully:', usersData?.length || 0, 'users');
        setUsers(usersData || []);
      }

      // Fetch categories (all categories for admin)
      console.log('📊 Fetching categories...');
      const { data: categoriesData, error: categoriesError } = await categoryService.getAllCategories();
      if (categoriesError) {
        console.error('❌ Error fetching categories:', categoriesError);
      } else {
        console.log('✅ Categories fetched successfully:', categoriesData?.length || 0, 'categories');
        setCategories(categoriesData || []);
      }

      // Fetch banners
      console.log('📊 Fetching banners...');
      const { data: bannersData, error: bannersError } = await bannerService.getBanners();
      if (bannersError) {
        console.error('❌ Error fetching banners:', bannersError);
      } else {
        console.log('✅ Banners fetched successfully:', bannersData?.length || 0, 'banners');
        setBanners(bannersData || []);
      }

      // Fetch pending deals
      console.log('📊 Fetching pending deals...');
      const { data: dealsData, error: dealsError } = await dealService.getPendingDeals();
      if (dealsError) {
        console.error('❌ Error fetching pending deals:', dealsError);
      } else {
        console.log('✅ Pending deals fetched successfully:', dealsData?.length || 0, 'deals');
        // Transform deals to include flagged status and report count
        const transformedDeals = (dealsData || []).map(deal => ({
          ...deal,
          flagged: false, // TODO: Implement report checking
          reportCount: 0, // TODO: Implement report counting
        }));
        setPendingDeals(transformedDeals);
      }

      // Calculate and set admin stats
      const calculatedStats = {
        totalUsers: usersData?.length || 0,
        activeDeals: 0, // Will be calculated separately if needed
        pendingReviews: dealsData?.length || 0,
        dailyActiveUsers: Math.floor((usersData?.length || 0) * 0.3), // mock
      };

      console.log('📊 Calculated stats:', calculatedStats);
      setAdminStats(calculatedStats);

      // Fetch system settings
      console.log('📊 Fetching system settings...');
      const { data: settingsData, error: settingsError } = await settingsService.getSettings();
      if (settingsError) {
        console.error('❌ Error fetching settings:', settingsError);
      } else {
        console.log('✅ Settings fetched successfully:', settingsData?.length || 0, 'settings');
        // Transform settings array to object and merge with defaults
        const settingsObj = (settingsData || []).reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as any);
        setSystemSettings({ ...defaultSystemSettings, ...settingsObj });
      }

      console.log('✅ Admin data load completed successfully');
    } catch (error) {
      console.error('❌ Unexpected error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // User management actions
  const handleUserAction = useCallback(async (userId: string, action: 'Ban' | 'Unban', adminId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${action.toLowerCase()} ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action, 
          style: action === 'Ban' ? 'destructive' : 'default',
          onPress: async () => {
            const newStatus = action === 'Ban' ? 'banned' : 'active';
            const { data, error } = await userService.updateUserStatus(userId, newStatus, adminId);
            
            if (error) {
              Alert.alert('Error', `Failed to ${action.toLowerCase()} user: ${error.message}`);
            } else {
              setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, status: newStatus } : u
              ));
              Alert.alert('Success', `User ${action.toLowerCase()}ned successfully`);
            }
          }
        }
      ]
    );
  }, [users]);

  // Deal management actions
  const handleDealAction = useCallback(async (dealId: string, action: 'Approve' | 'Reject', adminId: string) => {
    const deal = pendingDeals.find(d => d.id === dealId);
    if (!deal) return;
    
    Alert.alert(
      `${action} Deal`,
      `${action} "${deal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action,
          onPress: async () => {
            const newStatus = action === 'Approve' ? 'live' : 'archived';
            const { data, error } = await dealService.updateDeal(dealId, { status: newStatus });
            
            if (error) {
              Alert.alert('Error', `Failed to ${action.toLowerCase()} deal: ${error.message}`);
            } else {
              setPendingDeals(prev => prev.filter(d => d.id !== dealId));
              Alert.alert('Success', `Deal ${action.toLowerCase()}d successfully`);
              
              // Log admin activity
              await activityService.logActivity(
                adminId,
                'admin_action',
                `${action}d deal: ${deal.title}`,
                'deal',
                dealId
              );
            }
          }
        }
      ]
    );
  }, [pendingDeals]);

  // Category management actions
  const toggleCategory = useCallback(async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const { data, error } = await categoryService.updateCategory(categoryId, {
      is_active: !category.is_active
    });

    if (error) {
      Alert.alert('Error', `Failed to update category: ${error.message}`);
    } else {
      setCategories(prev => prev.map(c => 
        c.id === categoryId ? { ...c, is_active: !c.is_active } : c
      ));
    }
  }, [categories]);

  const addNewCategory = useCallback(async () => {
    let name: string | null = null;
    
    if (Platform.OS === 'web') {
      name = window.prompt('Enter category name:');
    } else {
      // For native platforms, use Alert.prompt
      Alert.prompt(
        'Add New Category',
        'Enter category name:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Category', 
            onPress: async (inputName) => {
              if (!inputName?.trim()) return;
              await createCategory(inputName.trim());
            }
          }
        ],
        'plain-text',
        '',
        'default'
      );
      return; // Exit early for native platforms as the callback handles the creation
    }
    
    // Handle web platform result
    if (name?.trim()) {
      await createCategory(name.trim());
    }
    
    async function createCategory(categoryName: string) {
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      const { data, error } = await categoryService.createCategory({
        name: categoryName,
        slug,
        emoji: '📦', // Default emoji
        is_active: true,
      });

      if (error) {
        Alert.alert('Error', `Failed to create category: ${error.message}`);
      } else {
        setCategories(prev => [...prev, data]);
        Alert.alert('Success', 'Category added successfully');
      }
    }
  }, []);

  // Banner management actions
  const toggleBanner = useCallback(async (bannerId: string) => {
    const banner = banners.find(b => b.id === bannerId);
    if (!banner) return;

    const { data, error } = await bannerService.updateBanner(bannerId, {
      is_active: !banner.is_active
    });

    if (error) {
      Alert.alert('Error', `Failed to update banner: ${error.message}`);
    } else {
      setBanners(prev => prev.map(b => 
        b.id === bannerId ? { ...b, is_active: !b.is_active } : b
      ));
    }
  }, [banners]);

  const addNewBanner = useCallback(async () => {
    let title: string | null = null;
    
    if (Platform.OS === 'web') {
      title = window.prompt('Enter banner title:');
    } else {
      // For native platforms, use Alert.prompt
      Alert.prompt(
        'Add New Banner',
        'Enter banner title:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Banner', 
            onPress: async (inputTitle) => {
              if (!inputTitle?.trim()) return;
              await createBanner(inputTitle.trim());
            }
          }
        ],
        'plain-text',
        '',
        'default'
      );
      return; // Exit early for native platforms as the callback handles the creation
    }
    
    // Handle web platform result
    if (title?.trim()) {
      await createBanner(title.trim());
    }
    
    async function createBanner(bannerTitle: string) {
      const { data, error } = await bannerService.createBanner({
        title: bannerTitle,
        description: 'New promotional banner',
        is_active: true,
        priority: banners.length + 1,
      });

      if (error) {
        Alert.alert('Error', `Failed to create banner: ${error.message}`);
      } else {
        setBanners(prev => [...prev, data]);
        Alert.alert('Success', 'Banner added successfully');
      }
    }
  }, [banners]);

  // Settings management
  const updateSetting = useCallback(async <K extends keyof SystemSettings>(
    key: K, 
    value: SystemSettings[K]
  ) => {
    const { data, error } = await settingsService.updateSetting(key, value);
    
    if (error) {
      Alert.alert('Error', `Failed to update setting: ${error.message}`);
    } else {
      setSystemSettings(prev => ({ ...prev, [key]: value }));
    }
  }, []);

  return {
    // Data
    users,
    categories,
    banners,
    pendingDeals,
    systemSettings,
    adminStats,
    loading,
    
    // Actions
    handleUserAction,
    handleDealAction,
    toggleCategory,
    addNewCategory,
    toggleBanner,
    addNewBanner,
    updateSetting,
    
    // Refresh function
    refreshData: loadAdminData,
  };
};          