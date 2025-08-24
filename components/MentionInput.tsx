import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { userService } from '@/services/userService';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export default function MentionInput({
  value,
  onChange,
  placeholder = 'Write a comment… Use @ to mention',
  placeholderTextColor = '#94a3b8',
  containerStyle,
  inputStyle,
}: Props) {
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);

  // Token immediately before the caret, like "@jo"
  const tokenInfo = useMemo(() => {
    const caret = selection.start;
    const left = value.slice(0, caret);
    const m = left.match(/@([A-Za-z0-9_]*)$/);
    if (!m) return null;
    const token = m[1];
    const tokenStart = left.lastIndexOf('@');
    return { token, tokenStart, caret };
  }, [value, selection]);

  useEffect(() => {
    if (tokenInfo) {
      setQuery(tokenInfo.token);
      setOpen(true);
    } else {
      setQuery('');
      setOpen(false);
    }
  }, [tokenInfo]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!open || query.length === 0) {
        setUsers([]);
        return;
      }
      const { data } = await userService.searchByUsernamePrefix(query);
      if (!cancelled) setUsers(data);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelection(e.nativeEvent.selection);
  };

  const insert = (username: string) => {
    if (!tokenInfo) return;
    const { tokenStart, caret } = tokenInfo;
    const before = value.slice(0, tokenStart);
    const after = value.slice(caret);
    const inserted = `@${username} `;
    const next = before + inserted + after;
    onChange(next);
    const newCaret = (before + inserted).length;
    setSelection({ start: newCaret, end: newCaret });
    setOpen(false);
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        multiline
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        textAlignVertical="center"
        blurOnSubmit={false}
        onSelectionChange={onSelectionChange}
        selection={selection}
      />
      {open && users.length > 0 && (
        <View style={styles.popup}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={users}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => insert(item.username)}>
                <Text style={styles.name}>@{item.username}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', flex: 1 },
  input: { minHeight: 40, maxHeight: 120, paddingHorizontal: 10, paddingVertical: 10, fontSize: 15 },
  popup: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    maxHeight: 180,
    zIndex: 20,
    overflow: 'hidden',
  },
  row: { paddingVertical: 10, paddingHorizontal: 12 },
  name: { fontWeight: '600' },
});
