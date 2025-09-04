// Debug component to check current user role
// Add this to your admin panel temporarily

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

export default function UserDebugInfo() {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Get current session
        const { data: session } = await supabase.auth.getSession();
        console.log('Session:', session);

        if (session.session?.user?.id) {
          // Get user details from users table
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, email, username, role, created_at')
            .eq('id', session.session.user.id)
            .single();

          console.log('User data:', userData, 'Error:', error);
          setUserInfo({
            authUser: session.session.user,
            dbUser: userData,
            error: error
          });
        }
      } catch (err) {
        console.error('Debug error:', err);
        setUserInfo({ error: err });
      }
    };

    checkUser();
  }, []);

  if (!userInfo) return <Text>Loading user info...</Text>;

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>🔍 User Debug Info</Text>
      <Text>Auth Email: {userInfo.authUser?.email}</Text>
      <Text>DB User ID: {userInfo.dbUser?.id}</Text>
      <Text>DB Role: {userInfo.dbUser?.role}</Text>
      <Text>Username: {userInfo.dbUser?.username}</Text>
      <Text>Created: {userInfo.dbUser?.created_at}</Text>
      {userInfo.error && <Text style={{ color: 'red' }}>Error: {JSON.stringify(userInfo.error)}</Text>}
    </View>
  );
}