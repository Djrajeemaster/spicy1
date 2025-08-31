import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import MentionInput from './MentionInput';
import { router } from 'expo-router';
import { commentService, CommentNode } from '@/services/commentService';
import { useAuth } from '@/contexts/AuthProvider';
import { UserRole, getRoleColor } from '@/types/user';
import { formatTimeAgo } from '@/utils/time';
import { sanitizeText, sanitizeUsername } from '@/utils/sanitization';

interface ThreadProps {
  dealId: string;
  nodes: CommentNode[];
  onPosted: () => void;
  depth?: number;
  onGuestAction?: () => void;
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

function CommentItem({ node, dealId, onPosted, depth = 0 }: ThreadProps & { node: CommentNode }) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [replyOpen, setReplyOpen] = useState(false);
  const [content, setContent] = useState('');

  const postReply = async () => {
    if (!user?.id || !content.trim()) return;
    if (!isUuid(dealId)) {
      Alert.alert('Not allowed', 'This is a sample deal. You cannot post replies.');
      return;
    }
    
    const sanitizedContent = sanitizeText(content.trim());
    if (!sanitizedContent) {
      Alert.alert('Invalid Input', 'Please enter valid content.');
      return;
    }
    
    await commentService.addComment(dealId, user.id, sanitizedContent, (node as any).id);
    setContent('');
    setReplyOpen(false);
    onPosted();
  };

  const username = (node as any).users?.username || 'user';
  const userRole = (node as any).users?.role as UserRole | undefined;
  const handleUserPress = () => {
    if (username && username !== 'user') {
      router.push(`/users/${username}`);
    }
  };

  return (
    <View style={[styles.item, { marginLeft: isDesktop ? (depth > 0 ? 32 : 0) : depth * 14 }, depth > 0 && isDesktop && styles.nestedItemDesktop]}>
      <Text style={styles.meta}>
        <Text
          style={[styles.author, userRole && { color: getRoleColor(userRole) }]}
          onPress={handleUserPress}
        >
          {sanitizeUsername(username)}
        </Text>
        <Text style={styles.timeAgo}> · {formatTimeAgo((node as any).created_at)}</Text>
      </Text>
      <Text style={styles.body}>{sanitizeText((node as any).content || '')}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setReplyOpen((v) => !v)}>
          <Text style={styles.link}>Reply</Text>
        </TouchableOpacity>
      </View>

      {replyOpen && (
        <View style={styles.replyBox}>
          <MentionInput value={content} onChange={setContent} />
          <TouchableOpacity style={styles.replyBtn} onPress={postReply}>
            <Text style={styles.replyBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      )}

      {(node.children || []).map((child: any) => (
        <CommentItem key={child.id} node={child} dealId={dealId} onPosted={onPosted} depth={depth + 1} />
      ))}
    </View>
  );
}

function NewCommentForm({ dealId, onPosted }: { dealId: string; onPosted: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  // Accept onGuestAction as prop
  const onGuestAction = (arguments as any).onGuestAction;

  const postComment = async () => {
    if (!user?.id || !content.trim() || isPosting) return;
    if (!isUuid(dealId)) {
      Alert.alert('Not allowed', 'This is a sample deal. You cannot post comments.');
      return;
    }
    
    const sanitizedContent = sanitizeText(content.trim());
    if (!sanitizedContent) {
      Alert.alert('Invalid Input', 'Please enter valid content.');
      return;
    }

    setIsPosting(true);
    await commentService.addComment(dealId, user.id, sanitizedContent, null); // parentId is null for new comments
    setContent('');
    setIsPosting(false);
    onPosted();
  };

  if (!user) {
    if (onGuestAction) onGuestAction();
    return (
      <View style={styles.signInPrompt}>
        <Text style={styles.signInText}>
          <Text style={styles.link} onPress={() => router.push('/sign-in')}>Sign in</Text> or{' '}
          <Text style={styles.link} onPress={() => router.push('/sign-up')}>sign up</Text> to post a comment.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.newCommentContainer}>
      <MentionInput value={content} onChange={setContent} placeholder="Add a comment..." />
      <TouchableOpacity style={styles.replyBtn} onPress={postComment} disabled={isPosting || !content.trim()}>
        {isPosting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.replyBtnText}>Post Comment</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CommentThread({ dealId, nodes, onPosted, depth = 0 }: ThreadProps) {
  return (
    <View>
      <NewCommentForm dealId={dealId} onPosted={onPosted} onGuestAction={arguments[0]?.onGuestAction} />
      {nodes.map((n: any) => (
        <CommentItem key={n.id} node={n} dealId={dealId} onPosted={onPosted} depth={depth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  meta: { color: '#64748b', marginBottom: 4 },
  author: { fontWeight: '700', color: '#0f172a' },
  timeAgo: { color: '#64748b' },
  body: { fontSize: 15, color: '#111827' },
  actions: { flexDirection: 'row', marginTop: 6 },
  link: { color: '#6366f1', fontWeight: '600' },
  replyBox: { marginTop: 12, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  replyBtn: { alignSelf: 'flex-start', backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 8, minWidth: 120, alignItems: 'center' },
  replyBtnText: { color: 'white', fontWeight: '700' },
  newCommentContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  signInPrompt: {
    backgroundColor: '#eef2ff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  signInText: {
    fontSize: 15,
    color: '#4338ca',
    textAlign: 'center',
    fontWeight: '500',
  },
  nestedItemDesktop: {
    paddingLeft: 24,
    borderLeftWidth: 2,
    borderLeftColor: '#eef2ff',
  },
});
