import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Comment = Database['public']['Tables']['comments']['Row'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];

export interface CommentWithUser extends Comment {
  users: {
    username: string;
    avatar_url: string | null;
  };
}

export interface CommentNode extends CommentWithUser {
  children: CommentNode[];
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

/** Build a nested thread tree from a flat comment list */
function buildTree(flat: CommentWithUser[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  flat.forEach((c) => byId.set(c.id, { ...(c as any), children: [] }));
  flat.forEach((c) => {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.children.push(byId.get(c.id)!);
    } else {
      roots.push(byId.get(c.id)!);
    }
  });

  // Sort threads by created_at (oldest → newest)
  const sortRec = (nodes: CommentNode[]) => {
    nodes.sort(
      (a, b) =>
        new Date(a.created_at as any).getTime() -
        new Date(b.created_at as any).getTime()
    );
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}

class CommentService {
  /** Fetch all active comments for a deal (flat) with joined user info */
  async getCommentsForDeal(
    dealId: string
  ): Promise<{ data: CommentWithUser[]; error: any }> {
    try {
      if (!isUuid(dealId)) return { data: [], error: null };

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users(username, avatar_url)
        `)
        .eq('deal_id', dealId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data: (data || []) as CommentWithUser[], error: null };
    } catch (error) {
      console.error('Error fetching comments for deal:', error);
      return { data: [], error };
    }
  }

  /** Add a comment (or reply if parentId) and bump deal comment_count via RPC */
  async addComment(
    dealId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<{ data: Comment | null; error: any }> {
    try {
      if (!isUuid(dealId)) return { data: null, error: new Error('dealId must be a UUID') };

      const commentData: CommentInsert = {
        deal_id: dealId,
        user_id: userId,
        content,
        parent_id: parentId ?? null,
        status: 'active',
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      if (error) throw error;

      // Optional RPC to keep counts in sync; ignore failure
      const { error: dealError } = await supabase.rpc('increment_comment_count', {
        deal_id_param: dealId,
      });
      if (dealError) {
        console.error('Error incrementing deal comment count:', dealError);
      }

      
      // --- Push notifications: mentions & replies ---
      try {
        const newCommentId = (data as any)?.id;
        const authorId = userId;
        const snippet = content.slice(0, 100);

        // 1) Reply notification to parent comment author (if any)
        if (parentId) {
          const { data: parentRow } = await supabase
            .from('comments' as any)
            .select('user_id')
            .eq('id', parentId)
            .maybeSingle();
          const parentUserId = parentRow?.user_id;
          if (parentUserId && parentUserId !== authorId) {
            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: parentUserId,
                title: 'New reply to your comment',
                body: snippet,
                data: { route: `/deal-details?id=${dealId}&comment=${newCommentId}` },
              }),
            });
          }
        }

        // 2) @mentions in content
        const usernames = Array.from(new Set((content.match(/@([A-Za-z0-9_]+)/g) || []).map(s => s.slice(1))));
        if (usernames.length) {
          const { data: users } = await supabase
            .from('users' as any)
            .select('id, username')
            .in('username', usernames);
          const targets = (users || []).map((u: any) => u.id).filter((uid: string) => uid && uid !== authorId);
          for (const uid of Array.from(new Set(targets))) {
            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: uid,
                title: 'You were mentioned',
                body: snippet,
                data: { route: `/deal-details?id=${dealId}&comment=${newCommentId}` },
              }),
            });
          }
        }
      } catch (e) {
        console.warn('Comment push notify failed:', e);
      }
return { data, error: null };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { data: null, error };
    }
  }

  /** Get comments as a nested thread for the deal */
  async getThreadForDeal(dealId: string) {
    if (!isUuid(dealId)) return { data: [] as CommentNode[], error: null };
    const { data, error } = await this.getCommentsForDeal(dealId);
    if (error) return { data: [] as CommentNode[], error };
    return { data: buildTree(data), error: null };
  }
}

export const commentService = new CommentService();
export type { CommentNode };
