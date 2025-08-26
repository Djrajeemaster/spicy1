import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MentionInput from './MentionInput';
import { commentService, CommentNode } from '@/services/commentService';
import { useAuth } from '@/contexts/AuthProvider';
import { formatTimeAgo } from '@/utils/time';
import { sanitizeText, sanitizeUsername } from '@/utils/sanitization';

interface ThreadProps {
  dealId: string;
  nodes: CommentNode[];
  onPosted: () => void;
  depth?: number;
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

function CommentItem({ node, dealId, onPosted, depth = 0 }: ThreadProps & { node: CommentNode }) {
  const { user } = useAuth();
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

  return (
    <View style={[styles.item, { marginLeft: depth * 14 }]}>
      <Text style={styles.meta}>
        <Text style={styles.author}>{sanitizeUsername((node as any).users?.username || 'user')}</Text>
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

export default function CommentThread({ dealId, nodes, onPosted, depth = 0 }: ThreadProps) {
  return (
    <View>
      {nodes.map((n: any) => (
        <CommentItem key={n.id} node={n} dealId={dealId} onPosted={onPosted} depth={depth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 10, borderLeftWidth: 2, borderLeftColor: '#e5e7eb', marginBottom: 8, paddingLeft: 10 },
  meta: { color: '#64748b', marginBottom: 4 },
  author: { fontWeight: '700', color: '#0f172a' },
  timeAgo: { color: '#64748b' },
  body: { fontSize: 15, color: '#111827' },
  actions: { flexDirection: 'row', marginTop: 6 },
  link: { color: '#6366f1', fontWeight: '600' },
  replyBox: { marginTop: 8 },
  replyBtn: { alignSelf: 'flex-start', backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  replyBtnText: { color: 'white', fontWeight: '700' },
});
