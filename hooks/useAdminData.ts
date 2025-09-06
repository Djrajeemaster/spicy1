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
  require_deal_images?: boolean;
  enable_content_filtering?: boolean;
  enable_location_services?: boolean;
  enable_push_notifications?: boolean;
  enable_social_sharing?: boolean;
  maintenance_mode?: boolean;
  enable_analytics?: boolean;
  enable_error_reporting?: boolean;
  enable_performance_monitoring?: boolean;
  max_daily_posts_per_user?: number;
  min_reputation_to_post?: number;
  soft_delete_retention_days?: number;
  auto_delete_expired_days?: number;
}

// Default system settings to ensure all properties are always defined
const defaultSystemSettings: SystemSettings = {
  auto_approve_verified: false,
  require_moderation_new_deals: true,
  allow_guest_posting: false,
  require_deal_images: false,
  enable_content_filtering: true,
  enable_location_services: true,
  enable_push_notifications: true,
  enable_social_sharing: true,
  maintenance_mode: false,
  enable_analytics: true,
  enable_error_reporting: true,
  enable_performance_monitoring: true,
  max_daily_posts_per_user: 5,
  min_reputation_to_post: 0,
  soft_delete_retention_days: 30,
  auto_delete_expired_days: 7,
};

export const useAdminData = () => {
  const isWeb = Platform.OS === 'web';

  // Cross-platform alert helpers: on web use window.alert/confirm, on native use Alert APIs
  function showAlert(title: string, message: string) {
    try {
      if (isWeb && typeof document !== 'undefined') {
        // lightweight professional toast for web
        const toastId = `toast-${Date.now()}-${Math.random()}`;
        const container = document.createElement('div');
        container.id = toastId;
        container.style.position = 'fixed';
        container.style.right = '20px';
        container.style.top = '20px';
        container.style.zIndex = '99999';
        container.style.minWidth = '260px';
        container.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        container.style.borderRadius = '8px';
        container.style.overflow = 'hidden';
        container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

        const titleEl = document.createElement('div');
        titleEl.style.background = '#111827';
        titleEl.style.color = '#fff';
        titleEl.style.padding = '10px 12px';
        titleEl.style.fontWeight = '700';
        titleEl.textContent = title;

        const bodyEl = document.createElement('div');
        bodyEl.style.padding = '10px 12px';
        bodyEl.style.color = '#0f172a';
        bodyEl.style.background = '#fff';
        bodyEl.textContent = message;

        container.appendChild(titleEl);
        container.appendChild(bodyEl);
        document.body.appendChild(container);

        setTimeout(() => {
          try { document.body.removeChild(container); } catch (e) { /* ignore */ }
        }, 3800);
      } else {
        Alert.alert(title, message);
      }
    } catch (e) {
      console.error('showAlert error', e);
    }
  }

  function showError(message: string) {
    showAlert('Error', message);
  }

  function showSuccess(message: string) {
    showAlert('Success', message);
  }

  function confirmAction(message: string): Promise<boolean> {
    if (isWeb && typeof document !== 'undefined') {
      // Create a modal-style confirm on the web and return a promise
      return new Promise<boolean>((resolve) => {
        try {
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.left = '0';
          overlay.style.top = '0';
          overlay.style.width = '100vw';
          overlay.style.height = '100vh';
          overlay.style.background = 'rgba(0,0,0,0.4)';
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '99998';

          const card = document.createElement('div');
          card.style.width = '420px';
          card.style.background = '#fff';
          card.style.borderRadius = '10px';
          card.style.padding = '20px';
          card.style.boxShadow = '0 10px 30px rgba(2,6,23,0.2)';
          card.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

          const msg = document.createElement('div');
          msg.style.marginBottom = '18px';
          msg.style.color = '#0f172a';
          msg.textContent = message;

          const actions = document.createElement('div');
          actions.style.display = 'flex';
          actions.style.justifyContent = 'flex-end';
          actions.style.gap = '10px';

          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'Cancel';
          cancelBtn.style.padding = '8px 12px';
          cancelBtn.style.borderRadius = '8px';
          cancelBtn.style.border = '1px solid #e5e7eb';
          cancelBtn.style.background = '#f8fafc';

          const okBtn = document.createElement('button');
          okBtn.textContent = 'Confirm';
          okBtn.style.padding = '8px 12px';
          okBtn.style.borderRadius = '8px';
          okBtn.style.border = 'none';
          okBtn.style.background = '#2563eb';
          okBtn.style.color = '#fff';

          cancelBtn.onclick = () => { try { document.body.removeChild(overlay); } catch (e) {} ; resolve(false); };
          okBtn.onclick = () => { try { document.body.removeChild(overlay); } catch (e) {} ; resolve(true); };

          actions.appendChild(cancelBtn);
          actions.appendChild(okBtn);
          card.appendChild(msg);
          card.appendChild(actions);
          overlay.appendChild(card);
          document.body.appendChild(overlay);
        } catch (e) {
          console.error('confirmAction error', e);
          resolve(false);
        }
      });
    }

    return new Promise<boolean>((resolve) => {
      try {
        Alert.alert('Confirm', message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'OK', onPress: () => resolve(true) },
        ]);
      } catch (e) {
        console.error('confirmAction error', e);
        resolve(false);
      }
    });
  }

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
    // loadAdminData will be called after it's defined
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
      const pendingRes = await dealService.getPendingDeals();
      let dealsData: DealWithRelations[] | null = null;
      let dealsError: any = null;
      if (Array.isArray(pendingRes) && pendingRes.length === 2) {
        // Some services return [error, data]
        dealsError = pendingRes[0];
        dealsData = pendingRes[1] as DealWithRelations[] | null;
      } else {
        // { data, error }
        dealsData = (pendingRes as any)?.data ?? null;
        dealsError = (pendingRes as any)?.error ?? null;
      }

      if (dealsError) {
        console.error('❌ Error fetching pending deals:', dealsError);
      } else {
        console.log('✅ Pending deals fetched successfully:', dealsData?.length || 0, 'deals');
        // Transform deals to include flagged status and report count
        const transformedDeals = (dealsData || []).map((deal: DealWithRelations) => ({
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
          // coerce string booleans and numbers to proper types
          const raw = setting.value;
          let v: any = raw;
          if (typeof raw === 'string') {
            const lr = raw.toLowerCase();
            if (lr === 'true' || lr === 'false') {
              v = lr === 'true';
            } else if (!Number.isNaN(Number(raw)) && raw.trim() !== '') {
              v = Number(raw);
            }
          }
          acc[setting.key] = v;
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

  // Fetch all admin data on mount
  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // User management actions
  const handleUserAction = useCallback(async (userId: string, action: 'Ban' | 'Unban', adminId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const confirmed = await confirmAction(`Are you sure you want to ${action.toLowerCase()} ${user.username}?`);
    if (!confirmed) return;

    try {
      const newStatus = action === 'Ban' ? 'banned' : 'active';
      const { data, error } = await userService.updateUserStatus(userId, newStatus, adminId);

      if (error) {
        showError(`Failed to ${action.toLowerCase()} user: ${error.message}`);
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        showSuccess(`User ${action.toLowerCase()}ned successfully`);
      }
    } catch (e) {
      console.error('handleUserAction error', e);
      showError('An unexpected error occurred');
    }
  }, [users]);

  // Deal management actions
  const handleDealAction = useCallback(async (dealId: string, action: 'Approve' | 'Reject' | 'Delete' | 'HardDelete', adminId: string) => {
    // Find deal in all deals, not just pending deals
    let deal = pendingDeals.find(d => d.id === dealId);
    if (!deal) {
      // If not in pending deals, it might be in other statuses, so just proceed with the action
      console.log('Deal not found in pendingDeals, proceeding with action anyway');
    }
    
    if (action === 'Delete') {
      // Soft delete - mark as draft instead of permanent deletion
      const updateRes = await dealService.updateDeal(dealId, { status: 'draft' });
      let updateError: any = null;
      if (Array.isArray(updateRes) && updateRes.length === 2) {
        updateError = updateRes[0];
      } else {
        updateError = (updateRes as any)?.error ?? null;
      }
      if (updateError) throw new Error(`Failed to delete deal: ${updateError.message || updateError}`);
      setPendingDeals(prev => prev.filter(d => d.id !== dealId));
    } else if (action === 'HardDelete') {
      // Hard delete - permanently remove from database
      const deleteRes = await dealService.deleteDeal(dealId);
      let deleteError: any = null;
      if (Array.isArray(deleteRes) && deleteRes.length === 2) {
        deleteError = deleteRes[0];
      } else {
        deleteError = (deleteRes as any)?.error ?? null;
      }
      if (deleteError) throw new Error(`Failed to permanently delete deal: ${deleteError.message || deleteError}`);
      setPendingDeals(prev => prev.filter(d => d.id !== dealId));
    } else {
      const newStatus = action === 'Approve' ? 'live' : 'expired';
      const updateRes = await dealService.updateDeal(dealId, { status: newStatus });
      let updateError: any = null;
      if (Array.isArray(updateRes) && updateRes.length === 2) {
        updateError = updateRes[0];
      } else {
        updateError = (updateRes as any)?.error ?? null;
      }

      if (updateError) throw new Error(`Failed to ${action.toLowerCase()} deal: ${updateError.message || updateError}`);
      setPendingDeals(prev => prev.filter(d => d.id !== dealId));
      
      // Log admin activity
      await activityService.logActivity(
        adminId,
        'admin_action',
        `${action}d deal: ${dealId}`,
        'deal',
        dealId
      );
    }
  }, [pendingDeals]);

  // Category management actions
  const toggleCategory = useCallback(async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    try {
      const { data, error } = await categoryService.updateCategory(categoryId, {
        is_active: !category.is_active
      });

      if (error) {
        showError(`Failed to update category: ${error.message}`);
      } else {
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, is_active: !c.is_active } : c));
        showSuccess('Category updated');
      }
    } catch (e) {
      console.error('toggleCategory error', e);
      showError('Failed to update category');
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
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error } = await categoryService.createCategory({
        name: categoryName,
        slug,
        emoji: '📦', // Default emoji
        is_active: true,
      } as any);

      if (error) {
        showError(`Failed to create category: ${error.message}`);
      } else if (data) {
        setCategories(prev => [...prev, data]);
        showSuccess('Category added successfully');
      }
    }
  }, []);

  // Banner management actions
  const toggleBanner = useCallback(async (bannerId: string) => {
    const banner = banners.find(b => b.id === bannerId);
    if (!banner) return;

    try {
      const { data, error } = await bannerService.updateBanner(bannerId, {
        is_active: !banner.is_active
      });

      if (error) {
        showError(`Failed to update banner: ${error.message}`);
      } else {
        setBanners(prev => prev.map(b => b.id === bannerId ? { ...b, is_active: !b.is_active } : b));
        showSuccess('Banner updated');
      }
    } catch (e) {
      console.error('toggleBanner error', e);
      showError('Failed to update banner');
    }
  }, [banners]);

  const deleteBanner = useCallback(async (bannerId: string) => {
    try {
      const { error } = await bannerService.deleteBanner(bannerId);

      if (error) {
        showError(`Failed to delete banner: ${error.message}`);
      } else {
        setBanners(prev => prev.filter(b => b.id !== bannerId));
        showSuccess('Banner deleted successfully');
      }
    } catch (e) {
      console.error('deleteBanner error', e);
      showError('Failed to delete banner');
    }
  }, []);

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
        showError(`Failed to create banner: ${error.message}`);
      } else if (data) {
        setBanners(prev => [...prev, data]);
        showSuccess('Banner added successfully');
      }
    }
  }, [banners]);

  // Settings management
  const updateSetting = useCallback(async <K extends keyof SystemSettings>(
    key: K, 
    value: SystemSettings[K],
    notify: boolean = true
  ) => {
    try {
      const { data, error } = await settingsService.updateSetting(key, value);

      if (error) {
        showError(`Failed to update setting: ${error.message}`);
      } else {
        setSystemSettings(prev => ({ ...prev, [key]: value }));
        if (notify) showSuccess('Setting updated');
      }
    } catch (e) {
      console.error('updateSetting error', e);
      showError('Failed to update setting');
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
    deleteBanner,
    updateSetting,
    
    // Refresh function
    refreshData: loadAdminData,
  };
};
