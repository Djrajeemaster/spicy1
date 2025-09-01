const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  {
    email: 'user@example.com',
    password: 'password123',
    username: 'generaluser',
    role: 'user'
  },
  {
    email: 'business@example.com', 
    password: 'password123',
    username: 'verifiedbiz',
    role: 'verified_business'
  },
  {
    email: 'moderator@example.com',
    password: 'password123', 
    username: 'moderator',
    role: 'moderator'
  },
  {
    email: 'admin@example.com',
    password: 'password123',
    username: 'admin', 
    role: 'admin'
  },
  {
    email: 'superadmin@example.com',
    password: 'password123',
    username: 'superadmin',
    role: 'superadmin'
  }
];

async function createUsers() {
  for (const user of users) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) {
        console.error(`Error creating auth user ${user.username}:`, authError);
        continue;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          reputation: user.role === 'user' ? 1.0 : 5.0,
          status: 'active'
        });

      if (profileError) {
        console.error(`Error creating profile for ${user.username}:`, profileError);
      } else {
        console.log(`✅ Created ${user.role}: ${user.username} (${user.email})`);
      }
    } catch (error) {
      console.error(`Error creating user ${user.username}:`, error);
    }
  }
}

createUsers().then(() => {
  console.log('User creation complete');
  process.exit(0);
});