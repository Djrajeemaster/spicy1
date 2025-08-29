import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { safeAsync } from '@/utils/errorHandler';

// Define the CommentNode type that the UI components expect
export type CommentWithUser = Database['public']['Tables']['comments']['Row'] & {
  users: Pick<Database['public']['Tables']['users']['Row'], 'username' | 'avatar_url'> | null;
};

export interface CommentNode extends CommentWithUser {
  children: CommentNode[];
}

class CommentService {
  /**
   * Fetches all comments for a deal and structures them into a tree.
   */
  getComments(dealId: string) {
    return safeAsync(async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users!comments_user_id_fkey(username, avatar_url)
        `)
        .eq('deal_id', dealId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return this.buildCommentTree((data as CommentWithUser[]) || []);
    }, 'CommentService.getComments');
  }

  /**
   * Adds a new comment to a deal.
   */
  addComment(dealId: string, userId: string, content: string, parentId?: string | null) {
    return safeAsync(async () => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          deal_id: dealId,
          user_id: userId,
          content,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Also increment the comment count on the deal
      await supabase.rpc('increment_comment_count', { deal_id_param: dealId });

      return data;
    }, 'CommentService.addComment');
  }

  /**
   * Flag a comment as inappropriate
   */
  flagComment(commentId: string, userId: string, reason?: string) {
    return safeAsync(async () => {
      // Increment the flag count
      const { error: updateError } = await supabase
        .from('comments')
        .update({
          flag_count: supabase.sql`flag_count + 1`,
          flagged_by: userId,
          flagged_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (updateError) throw updateError;

      // Optionally log the flag reason in user_reports table
      if (reason) {
        await supabase
          .from('user_reports')
          .insert({
            reporter_id: userId,
            reported_content_id: commentId,
            content_type: 'comment',
            reason: reason,
            description: `Comment flagged: ${reason}`
          });
      }

      return { success: true };
    }, 'CommentService.flagComment');
  }

  /**
   * Helper function to build a tree from a flat list of comments.
   */
  private buildCommentTree(comments: CommentWithUser[]): CommentNode[] {
    const commentMap: { [key: string]: CommentNode } = {};
    const rootComments: CommentNode[] = [];

    for (const comment of comments) commentMap[comment.id] = { ...comment, children: [] };

    for (const commentId in commentMap) {
      const node = commentMap[commentId];
      if (node.parent_id && commentMap[node.parent_id]) commentMap[node.parent_id].children.push(node);
      else rootComments.push(node);
    }

    return rootComments;
  }
}

export const commentService = new CommentService();