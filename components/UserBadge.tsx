import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, Crown, Star, Building2, Zap, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserRole, getRoleColor, getRoleDisplayName } from '@/types/user';

interface UserBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  reputation?: number;
}

export function UserBadge({ role, size = 'medium', showText = true, reputation }: UserBadgeProps) {
  if (role === 'guest') return null;

  const getBadgeIcon = () => {
    const iconSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
    const iconColor = '#FFFFFF';

    switch (role) {
      case 'user':
        return <Star size={iconSize} color={iconColor} />;
      case 'verified':
        return <Shield size={iconSize} color={iconColor} />;
      case 'business':
        return <Building2 size={iconSize} color={iconColor} />;
      case 'moderator':
        return <Users size={iconSize} color={iconColor} />;
      case 'admin':
        return <Crown size={iconSize} color={iconColor} />;
      case 'superadmin':
        return <Zap size={iconSize} color={iconColor} />;
      default:
        return <Star size={iconSize} color={iconColor} />;
    }
  };

  const getBadgeGradient = () => {
    switch (role) {
      case 'user':
        return ['#6366f1', '#4f46e5'];
      case 'verified':
        return ['#10b981', '#059669'];
      case 'business':
        return ['#f59e0b', '#d97706'];
      case 'moderator':
        return ['#8b5cf6', '#7c3aed'];
      case 'admin':
        return ['#ef4444', '#dc2626'];
      case 'superadmin':
        return ['#dc2626', '#991b1b'];
      default:
        return ['#6366f1', '#4f46e5'];
    }
  };

  const badgeStyle = size === 'small' ? styles.badgeSmall : size === 'medium' ? styles.badgeMedium : styles.badgeLarge;
  const textStyle = size === 'small' ? styles.textSmall : size === 'medium' ? styles.textMedium : styles.textLarge;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getBadgeGradient()}
        style={[styles.badge, badgeStyle]}
      >
        {getBadgeIcon()}
        {showText && (
          <Text style={[styles.badgeText, textStyle]}>
            {getRoleDisplayName(role)}
          </Text>
        )}
      </LinearGradient>
      {reputation && reputation >= 4.5 && (
        <View style={styles.reputationBadge}>
          <Star size={10} color="#fbbf24" fill="#fbbf24" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 4,
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
  reputationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});