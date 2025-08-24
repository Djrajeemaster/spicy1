import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';
import { router } from 'expo-router';

type Author = { id: string; username?: string | null; reputation?: number | null };

type Props = {
  author?: Author;
  onFollow?: (userId: string, nextState: boolean) => Promise<void> | void;
  isFollowing?: boolean;
  hideFollow?: boolean;
};

export const DealMeta: React.FC<Props> = ({
  author,
  onFollow,
  isFollowing: initial = false,
  hideFollow = false,
}) => {
  const [isFollowing, setIsFollowing] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);

  if (!author) return null;
  const name = (author.username || 'Unknown').trim();
  const rep = Number(author.reputation ?? 0);

  const handleFollow = async () => {
    const next = !isFollowing;
    try {
      await onFollow?.(author.id, next);
    } catch {}
    setIsFollowing(next);
    setToast(next ? `Following ${name}` : `Unfollowed ${name}`);
    setTimeout(() => setToast(null), 1200);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.by}>Posted by</Text>

      <View style={styles.userBlock}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => router.push(`/u/${author.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{(name[0] || 'U').toUpperCase()}</Text>
          </View>
          <Text numberOfLines={1} style={styles.username}>
            {name}
          </Text>
        </TouchableOpacity>

        {!hideFollow && (
          <TouchableOpacity onPress={handleFollow} activeOpacity={0.85} style={styles.followBtn}>
            <Text style={[styles.followTxt, isFollowing && styles.followTxtOn]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {rep > 0 && (
        <View style={styles.rep}>
          <Star size={12} color="#f59e0b" />
          <Text style={styles.repTxt}>{rep.toFixed(1)}</Text>
        </View>
      )}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastTxt}>{toast}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  by: {
    color: '#64748b',
    fontWeight: '500',
    fontSize: 13,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  username: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },

  // Compact follow button (same height as username line)
  followBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fff',
    alignSelf: 'center', // align with text baseline
  },
  followTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  followTxtOn: {
    color: '#2563eb',
  },

  rep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  repTxt: {
    color: '#f59e0b',
    fontWeight: '700',
    marginLeft: 2,
    fontSize: 11,
  },
  toast: {
    marginLeft: 8,
    backgroundColor: 'rgba(17,24,39,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toastTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
