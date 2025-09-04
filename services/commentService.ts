
import { Database } from '@/types/database';
import { safeAsync } from '@/utils/errorHandler';
import { apiClient } from '@/utils/apiClient';

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
      const data = await apiClient.get(`/deals/${dealId}/comments`) as CommentWithUser[];
      return this.buildCommentTree((data) || []);
    }, 'CommentService.getComments');
  }

  /**
   * Adds a new comment to a deal.
   */
  addComment(dealId: string, userId: string, content: string, parentId?: string | null) {
    return safeAsync(async () => {
      const data = await apiClient.post(`/deals/${dealId}/comments`, { userId, content, parentId });
      return data;
    }, 'CommentService.addComment');
  }

  /**
   * Flag a comment as inappropriate
   */
  flagComment(commentId: string, userId: string, reason?: string) {
    return safeAsync(async () => {
      await apiClient.post(`/comments/${commentId}/flag`, { userId, reason });
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
