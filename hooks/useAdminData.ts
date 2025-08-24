import { useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { UserRole } from '@/types/user';
import { userService } from '@/services/userService';
import { dealService, DealWithRelations } from '@/services/dealService';
import { categoryService } from '@/services/categoryService';
import { bannerService, Banner } from '@/services/bannerService';
import { settingsService, SystemSetting } from '@/services/settingsService';
import { Database } from '@/types/database';
import { activityService } from '@/services/activityService';

type UserProfile = Database['public']['Tables']['users']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export interface AdminUser extends UserProfile {
  // Additional computed fields for admin UI
}

export interface AdminCategory extends Category {
  // Additional computed fields for admin UI
}

export interface AdminBanner extends Banner {
  // Additional computed fields for admin UI
}

export interface AdminDeal extends DealWithRelations {
  flagged: boolean;
  reportCount: number;
}

export interface AdminStats {
  totalUsers: number;
  activeDeals: number;
  pendingReviews: number;
  dailyActiveUsers: number;
}

export interface SystemSettings {
  autoApproveVerifiedUsers: boolean;
  requireModeration: boolean;
  allowGuestPosting: boolean;
  maxDailyPosts: number;
  minReputationToPost: number;
}

// Default system settings to ensure all properties are always defined
const defaultSystemSettings: SystemSettings = {
  autoApproveVerifiedUsers: true,
  requireModeration: true,
  allowGuestPosting: false,
  maxDailyPosts: 5,
  minReputationToPost: 2.0,
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
    const loadAdminData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const { data: usersData, error: usersError } = await userService.getAllUsers();
        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          setUsers(usersData);
        }

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await categoryService.getCategories();
        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
        } else {
          setCategories(categoriesData);
        }

        // Fetch banners
        const { data: bannersData, error: bannersError } = await bannerService.getBanners();
        if (bannersError) {
          console.error('Error fetching banners:', bannersError);
        } else {
          setBanners(bannersData);
        }

        // Fetch pending deals
        const { data: dealsData, error: dealsError } = await dealService.getPendingDeals();
        if (dealsError) {
          console.error('Error fetching pending deals:', dealsError);
        } else {
          // Transform deals to include flagged status and report count
          const transformedDeals = dealsData.map(deal => ({
            ...deal,
            flagged: false, // TODO: Implement report checking
            reportCount: 0, // TODO: Implement report counting
          }));
          setPendingDeals(transformedDeals);
        }

        // Fetch admin stats
        const { data: statsData, error: statsError } = await dealService.getAdminStats();
        if (statsError) {
          console.error('Error fetching admin stats:', statsError);
        } else {
          setAdminStats(statsData);
        }

        // Fetch system settings
        const { data: settingsData, error: settingsError } = await settingsService.getSettings();
        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
        } else {
          // Transform settings array to object and merge with defaults
          const settingsObj = settingsData.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
          }, {} as any);
          setSystemSettings({ ...defaultSystemSettings, ...settingsObj });
        }
      } catch (error) {
        console.error('Unexpected error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
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
  };
};