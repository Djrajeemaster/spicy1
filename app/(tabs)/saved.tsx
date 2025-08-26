// app/(tabs)/saved.tsx — moved into Profile tabs. We keep this file to preserve deep links.
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RedirectToProfileSaved() {
  useEffect(() => { router.replace(`/profile?tab=saved`); }, []);
  return null;
}
