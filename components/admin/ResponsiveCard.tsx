import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onPress?: () => void;
  gradient?: [string, string, ...string[]];
  icon?: React.ReactNode;
  badge?: string;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  title,
  subtitle,
  children,
  onPress,
  gradient,
  icon,
  badge
}) => {
  const responsive = useResponsive();
  const styles = getStyles(responsive);

  const CardContent = () => (
    <>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        {children}
      </View>
    </>
  );

  if (gradient) {
    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.8 : 1}
      >
        <LinearGradient
          colors={gradient}
          style={styles.gradientCard}
        >
          <CardContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.cardContainer, styles.whiteCard]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <CardContent />
    </TouchableOpacity>
  );
};

const getStyles = (responsive: any) => StyleSheet.create({
  cardContainer: {
    marginBottom: responsive.isDesktop ? 24 : 16,
    borderRadius: responsive.isDesktop ? 16 : 12,
    overflow: 'hidden',
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsive.isDesktop ? 8 : 4 },
    shadowOpacity: responsive.isDesktop ? 0.12 : 0.08,
    shadowRadius: responsive.isDesktop ? 16 : 8,
    elevation: responsive.isDesktop ? 8 : 4,
    borderWidth: responsive.isDesktop ? 1 : 0,
    borderColor: '#f1f5f9',
  },
  gradientCard: {
    padding: responsive.isDesktop ? 24 : 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsive.isDesktop ? 20 : 16,
    paddingHorizontal: responsive.isDesktop ? 0 : 20,
    paddingTop: responsive.isDesktop ? 0 : 20,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: responsive.isDesktop ? 20 : 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: responsive.isDesktop ? 14 : 13,
    color: '#64748b',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  cardContent: {
    paddingHorizontal: responsive.isDesktop ? 0 : 20,
    paddingBottom: responsive.isDesktop ? 0 : 20,
  },
});