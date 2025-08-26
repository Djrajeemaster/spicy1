// app/(tabs)/following.tsx — moved into Profile tabs. We keep this file to preserve deep links.
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RedirectToProfileFollowing() {
  useEffect(() => { router.replace(`/profile?tab=following`); }, []);
  return null;
}
