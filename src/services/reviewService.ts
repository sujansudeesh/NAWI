import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ReviewComment {
  id: string;
  sessionId: string;
  sessionTestId?: string;
  comment: string;
  commentType: 'GENERAL' | 'CHANGE_REQUEST' | 'TECHNICAL_REVIEW' | 'APPROVAL_NOTE';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export const reviewService = {
  /**
   * Get review comments for a session
   */
  async getComments(sessionId: string): Promise<ReviewComment[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('review_comments')
        .select('*, profiles(full_name)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          sessionId: row.session_id,
          sessionTestId: row.session_test_id,
          comment: row.comment,
          commentType: row.comment_type,
          createdBy: row.created_by,
          createdByName: row.profiles?.full_name || 'Reviewer',
          createdAt: row.created_at,
        }));
      }
    }
    return [];
  },

  /**
   * Add a new review comment
   */
  async addComment(comment: {
    sessionId: string;
    sessionTestId?: string;
    comment: string;
    commentType: 'GENERAL' | 'CHANGE_REQUEST' | 'TECHNICAL_REVIEW' | 'APPROVAL_NOTE';
    createdBy: string;
  }): Promise<ReviewComment> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('review_comments')
        .insert({
          session_id: comment.sessionId,
          session_test_id: comment.sessionTestId,
          comment: comment.comment,
          comment_type: comment.commentType,
          created_by: comment.createdBy,
        })
        .select('*, profiles(full_name)')
        .single();

      if (error) {
        throw new Error(`Failed to save review comment: ${error.message}`);
      }

      return {
        id: data.id,
        sessionId: data.session_id,
        sessionTestId: data.session_test_id,
        comment: data.comment,
        commentType: data.comment_type,
        createdBy: data.created_by,
        createdByName: data.profiles?.full_name || 'Reviewer',
        createdAt: data.created_at,
      };
    }

    return {
      id: `rc-${Date.now()}`,
      sessionId: comment.sessionId,
      sessionTestId: comment.sessionTestId,
      comment: comment.comment,
      commentType: comment.commentType,
      createdBy: comment.createdBy,
      createdByName: 'Technical Reviewer',
      createdAt: new Date().toISOString(),
    };
  },
};
