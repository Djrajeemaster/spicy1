

interface ModerationItem {
  id: string;
  type: 'deal' | 'comment' | 'user_report';
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
    email: string;
    reputation: number;
  };
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  category?: string;
  image_url?: string;
  reports_count?: number;
  reason?: string;
}

class AdminModerationService {
  async getModerationQueue(filter: 'all' | 'deals' | 'comments' | 'reports'): Promise<ModerationItem[]> {
    try {
      const items: ModerationItem[] = [];

      if (filter === 'all' || filter === 'deals') {
        // Get pending deals
        const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select(`
            id,
            title,
            description,
            created_at,
            category_id,
            image_url,
            users!inner(id, username, email, reputation)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (dealsError) throw dealsError;

        deals?.forEach(deal => {
          items.push({
            id: deal.id,
            type: 'deal',
            title: deal.title,
            content: deal.description || '',
            author: {
              id: (deal as any).users.id,
              username: (deal as any).users.username || '',
              email: (deal as any).users.email || '',
              reputation: (deal as any).users.reputation || 0,
            },
            created_at: deal.created_at,
            status: 'pending',
            image_url: deal.image_url,
          });
        });
      }

      if (filter === 'all' || filter === 'comments') {
        // Get reported comments
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            users!inner(id, username, email, reputation),
            deals!inner(title)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;

        comments?.forEach(comment => {
          items.push({
            id: comment.id,
            type: 'comment',
            title: `Comment on: ${(comment as any).deals.title}`,
            content: comment.content,
            author: {
              id: (comment as any).users.id,
              username: (comment as any).users.username || '',
              email: (comment as any).users.email || '',
              reputation: (comment as any).users.reputation || 0,
            },
            created_at: comment.created_at,
            status: 'pending',
          });
        });
      }

      if (filter === 'all' || filter === 'reports') {
        // Get user reports
        const { data: reports, error: reportsError } = await supabase
          .from('user_reports')
          .select(`
            id,
            reason,
            description,
            created_at,
            reporter:users!user_reports_reporter_id_fkey(id, username, email),
            reported:users!user_reports_reported_user_id_fkey(id, username, email, reputation)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;

        reports?.forEach(report => {
          items.push({
            id: report.id,
            type: 'user_report',
            title: `User Report: ${report.reason}`,
            content: report.description || '',
            author: {
              id: (report as any).reported.id,
              username: (report as any).reported.username || '',
              email: (report as any).reported.email || '',
              reputation: (report as any).reported.reputation || 0,
            },
            created_at: report.created_at,
            status: 'pending',
            reason: report.reason,
          });
        });
      }

      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
      throw error;
    }
  }

  async approveContent(id: string, type: 'deal' | 'comment' | 'user_report', elevationToken: string): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-approve-content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve content');
      }
    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  }

  async rejectContent(id: string, type: 'deal' | 'comment' | 'user_report', elevationToken: string): Promise<void> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-elevation': elevationToken,
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/admin-reject-content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, type }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject content');
      }
    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    }
  }

  async getModerationStats(): Promise<{
    pending_deals: number;
    pending_comments: number;
    pending_reports: number;
    approved_today: number;
    rejected_today: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: pendingDeals },
        { count: pendingComments },
        { count: pendingReports },
        { count: approvedToday },
        { count: rejectedToday }
      ] = await Promise.all([
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('admin_actions').select('*', { count: 'exact', head: true })
          .eq('action_type', 'approve')
          .gte('created_at', today.toISOString()),
        supabase.from('admin_actions').select('*', { count: 'exact', head: true })
          .eq('action_type', 'reject')
          .gte('created_at', today.toISOString()),
      ]);

      return {
        pending_deals: pendingDeals || 0,
        pending_comments: pendingComments || 0,
        pending_reports: pendingReports || 0,
        approved_today: approvedToday || 0,
        rejected_today: rejectedToday || 0,
      };
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      return {
        pending_deals: 0,
        pending_comments: 0,
        pending_reports: 0,
        approved_today: 0,
        rejected_today: 0,
      };
    }
  }
}

export const adminModerationService = new AdminModerationService();
