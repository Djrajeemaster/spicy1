// services/dealService.ts
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { activityService } from './activityService';
import { locationService, type LocationData } from './locationService';

type Deal = Database['public']['Tables']['deals']['Row'];
type DealInsert = Database['public']['Tables']['deals']['Insert'];
type DealUpdate = Database['public']['Tables']['deals']['Update'];

export interface DealWithRelations extends Deal {
  store: { id: string; name: string; slug: string; logo_url: string | null; verified: boolean };
  category: { id: string; name: string; emoji: string };
  created_by_user: { id: string; username: string; role: string; reputation: number } | null;
  user_vote?: { vote_type: 'up' | 'down' } | null;
  is_saved?: boolean;
  rank?: number;
}

export interface DealFilters {
  categories?: string[];
  stores?: string[];
  category?: string;
  store?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  location?: string;
  isOnline?: boolean;
  tags?: string[];
  expiringOnly?: boolean;
  sortBy?: 'newest' | 'popular' | 'ending_soon' | 'price_low' | 'price_high';
  limit?: number;
  offset?: number;
  userLocation?: LocationData | null;
  radius?: number; // miles
}

/** Escape single quotes for literal embedding in SQL strings */
function escapeSingleQuotes(input: string): string {
  return input.replace(/'/g, "''");
}

// NOTE: If your FK name differs, you can swap to `users!created_by(...)`
// which targets the column name rather than the constraint name.
const REL_USER = `created_by_user:users!deals_created_by_fkey(id, username, role, reputation)`;
const REL_STORE = `store:stores(id, name, slug, logo_url, verified)`;
const REL_CATEGORY = `category:categories(id, name, emoji)`;

class DealService {
  async getDeals(
    filters: DealFilters = {},
    userId?: string
  ): Promise<{ data: DealWithRelations[]; error: any }> {
    try {
      const withUserBits =
        userId
          ? `, user_vote:votes!left(vote_type, user_id), saved_deals!left(id, user_id)`
          : '';

      const baseSelect = `
        *,
        ${REL_STORE},
        ${REL_CATEGORY},
        ${REL_USER}
        ${withUserBits}
      `;

      let query = supabase.from('deals').select(baseSelect).eq('status', 'live');

      // --- filters ---
      if (filters.categories?.length) {
        const cats = filters.categories.filter(c => c && c !== 'all');
        if (cats.length) query = query.in('category_id', cats);
      } else if (filters.category && filters.category !== 'all') {
        query = query.eq('category_id', filters.category);
      }

      if (filters.stores?.length) {
        const sts = filters.stores.filter(s => s && s !== 'all');
        if (sts.length) query = query.in('store_id', sts);
      } else if (filters.store && filters.store !== 'all') {
        query = query.eq('store_id', filters.store);
      }

      if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);

      // If you physically have "discount_percentage" in DB, keep this:
      if (filters.minDiscount !== undefined) {
        query = query.gte('discount_percentage', filters.minDiscount);
      }

      if (filters.location) {
        const loc = filters.location.trim();
        if (loc) query = query.or(`city.ilike.%${loc}%,state.ilike.%${loc}%`);
      }

      if (filters.isOnline !== undefined) query = query.eq('is_online', filters.isOnline);
      if (filters.tags?.length) query = query.cs('tags', filters.tags);

      if (filters.expiringOnly) {
        const now = new Date();
        const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        query = query.gte('expiry_date', now.toISOString()).lte('expiry_date', in48h.toISOString());
      }

      // --- search + rank ---
      let finalQuery = query;
      if (filters.search?.trim()) {
        const raw = filters.search.trim();
        finalQuery = finalQuery.textSearch('searchable_text', raw, { type: 'websearch', config: 'english' });

        const esc = escapeSingleQuotes(raw);
        finalQuery = finalQuery
          .select(
            `
            *,
            ${REL_STORE},
            ${REL_CATEGORY},
            ${REL_USER},
            rank:ts_rank(searchable_text, websearch_to_tsquery('english','${esc}'))
            ${withUserBits}
          `,
            { count: null }
          )
          .order('rank', { ascending: false })
          .order('created_at', { ascending: false });
      } else {
        finalQuery = finalQuery.select(baseSelect, { count: null });
        switch (filters.sortBy) {
          case 'popular':
            finalQuery = finalQuery.order('votes_up', { ascending: false });
            break;
          case 'ending_soon':
            finalQuery = finalQuery.order('expiry_date', { ascending: true });
            break;
          case 'price_low':
            finalQuery = finalQuery.order('price', { ascending: true });
            break;
          case 'price_high':
            finalQuery = finalQuery.order('price', { ascending: false });
            break;
          default:
            finalQuery = finalQuery.order('created_at', { ascending: false });
        }
      }

      // Scope embedded relations to the current user
      if (userId) {
        finalQuery = finalQuery
          .eq('user_vote.user_id', userId)
          .eq('saved_deals.user_id', userId);
      }

      // pagination
      if (typeof filters.offset === 'number' && typeof filters.limit === 'number') {
        finalQuery = finalQuery.range(filters.offset, filters.offset + filters.limit - 1);
      } else if (typeof filters.limit === 'number') {
        finalQuery = finalQuery.limit(filters.limit);
      }

      // execute
      const { data, error } = await finalQuery;
      if (error) throw error;

      // transform
      let transformed: DealWithRelations[] =
        (data as any[])?.map((deal: any) => ({
          ...deal,
          is_saved: Array.isArray(deal.saved_deals)
            ? deal.saved_deals.some((s: any) => s.user_id === userId)
            : false,
          user_vote: Array.isArray(deal.user_vote)
            ? deal.user_vote.find((v: any) => v.user_id === userId) || null
            : null,
        })) || [];

      // Optional client-side minDiscount if not stored in DB
      if (filters.minDiscount !== undefined) {
        transformed = transformed.filter(d => {
          if (typeof (d as any).discount_percentage === 'number') {
            return (d as any).discount_percentage >= (filters.minDiscount as number);
          }
          if (d.original_price && d.original_price > 0) {
            const pct = Math.round((1 - d.price / d.original_price) * 100);
            return pct >= (filters.minDiscount as number);
          }
          return false;
        });
      }

      // optional proximity filter (client side)
      if (filters.userLocation && typeof filters.radius === 'number' && filters.radius > 0) {
        transformed = locationService.filterDealsByProximity(
          transformed,
          filters.userLocation as LocationData,
          filters.radius as number
        );
      }

      return { data: transformed, error: null };
    } catch (error) {
      console.error('Error fetching deals:', error);
      return { data: [], error };
    }
  }

  async getDealById(id: string, userId?: string) {
    try {
      const withUserBits =
        userId
          ? `, user_vote:votes!left(vote_type, user_id), saved_deals!left(id, user_id)`
          : '';

      let q = supabase
        .from('deals')
        .select(
          `
          *,
          ${REL_STORE},
          ${REL_CATEGORY},
          ${REL_USER}
          ${withUserBits}
        `
        )
        .eq('id', id)
        .single();

      if (userId) {
        q = q.eq('user_vote.user_id', userId).eq('saved_deals.user_id', userId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const transformed = data
        ? {
            ...data,
            is_saved: Array.isArray((data as any).saved_deals)
              ? (data as any).saved_deals.some((s: any) => s.user_id === userId)
              : false,
            user_vote: Array.isArray((data as any).user_vote)
              ? (data as any).user_vote.find((v: any) => v.user_id === userId) || null
              : null,
          }
        : null;

      return { data: transformed as DealWithRelations | null, error: null };
    } catch (error) {
      console.error('Error fetching deal:', error);
      return { data: null, error };
    }
  }

  async createDeal(dealData: DealInsert) {
    try {
      const { data, error } = await supabase.from('deals').insert(dealData).select().single();
      if (error) throw error;

      if (data && dealData.created_by) {
        await activityService.logActivity(
          dealData.created_by,
          'post',
          `Posted "${(data as any).title}"`,
          'deal',
          (data as any).id
        );
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error creating deal:', error);
      return { data: null, error };
    }
  }

  async updateDeal(id: string, updates: DealUpdate) {
    try {
      const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating deal:', error);
      return { data: null, error };
    }
  }

  async deleteDeal(id: string) {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error deleting deal:', error);
      return { error };
    }
  }

  async voteDeal(dealId: string, userId: string, voteType: 'up' | 'down') {
    try {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('deal_id', dealId)
        .eq('user_id', userId)
        .maybeSingle(); // no throw when missing

      let activityType = '';
      let activityDescription = '';

      if (existingVote) {
        if ((existingVote as any).vote_type === voteType) {
          await supabase.from('votes').delete().eq('id', (existingVote as any).id);
          activityType = 'unvote';
          activityDescription = `Removed ${voteType}vote on deal ID: ${dealId.substring(0, 8)}...`;
        } else {
          await supabase.from('votes').update({ vote_type: voteType }).eq('id', (existingVote as any).id);
          activityType = 'vote_change';
          activityDescription = `Changed vote to ${voteType} on deal ID: ${dealId.substring(0, 8)}...`;
        }
      } else {
        await supabase.from('votes').insert({ deal_id: dealId, user_id: userId, vote_type: voteType });
        activityType = 'vote';
        activityDescription = `${voteType === 'up' ? 'Upvoted' : 'Downvoted'} deal ID: ${dealId.substring(0, 8)}...`;
      }

      const { data: votes } = await supabase.from('votes').select('vote_type').eq('deal_id', dealId);
      const upVotes = (votes as any[])?.filter(v => v.vote_type === 'up').length || 0;
      const downVotes = (votes as any[])?.filter(v => v.vote_type === 'down').length || 0;

      await supabase.from('deals').update({ votes_up: upVotes, votes_down: downVotes }).eq('id', dealId);

      await activityService.logActivity(userId, activityType, activityDescription, 'deal', dealId);
      return { error: null };
    } catch (error) {
      console.error('Error voting on deal:', error);
      return { error };
    }
  }

  async saveDeal(dealId: string, userId: string) {
    try {
      const { data: existingSave } = await supabase
        .from('saved_deals')
        .select('*')
        .eq('deal_id', dealId)
        .eq('user_id', userId)
        .maybeSingle();

      let activityType = '';
      let activityDescription = '';

      if (existingSave) {
        await supabase.from('saved_deals').delete().eq('id', (existingSave as any).id);
        activityType = 'unsave';
        activityDescription = `Unsaved deal ID: ${dealId.substring(0, 8)}...`;
      } else {
        await supabase.from('saved_deals').insert({ deal_id: dealId, user_id: userId });
        activityType = 'save';
        activityDescription = `Saved deal ID: ${dealId.substring(0, 8)}...`;
      }

      const { data: saves } = await supabase.from('saved_deals').select('id').eq('deal_id', dealId);
      await supabase.from('deals').update({ save_count: (saves as any[])?.length || 0 }).eq('id', dealId);

      await activityService.logActivity(userId, activityType, activityDescription, 'deal', dealId);
      return { error: null };
    } catch (error) {
      console.error('Error saving deal:', error);
      return { error };
    }
  }

  async getSavedDeals(userId: string) {
    try {
      const { data, error } = await supabase
        .from('saved_deals')
        .select(
          `
          deal:deals(
            *,
            ${REL_STORE},
            ${REL_CATEGORY},
            ${REL_USER}
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed =
        (data as any[])?.map(item => ({
          ...item.deal,
          is_saved: true,
          user_vote: null,
        })) || [];

      return { data: transformed, error: null };
    } catch (error) {
      console.error('Error fetching saved deals:', error);
      return { data: [], error };
    }
  }

  async getUserDeals(userId: string) {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`*, ${REL_STORE}, ${REL_CATEGORY}, ${REL_USER}`)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data as any[]) || [], error: null };
    } catch (error) {
      console.error('Error fetching user deals:', error);
      return { data: [], error };
    }
  }

  async getPendingDeals() {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`*, ${REL_STORE}, ${REL_CATEGORY}, ${REL_USER}`)
        .in('status', ['pending', 'draft', 'scheduled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data as any[]) || [], error: null };
    } catch (error) {
      console.error('Error fetching pending deals:', error);
      return { data: [], error };
    }
  }

  async getAdminStats() {
    try {
      const [usersCount, activeDealsCount, pendingDealsCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('status', 'live'),
        supabase
          .from('deals')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'draft', 'scheduled']),
      ]);

      const stats = {
        totalUsers: usersCount.count || 0,
        activeDeals: activeDealsCount.count || 0,
        pendingReviews: pendingDealsCount.count || 0,
        dailyActiveUsers: Math.floor((usersCount.count || 0) * 0.3), // mock
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return { data: null, error };
    }
  }
}

export const dealService = new DealService();
