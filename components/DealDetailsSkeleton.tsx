import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import { SafeAreaView } from 'react-native-safe-area-context';

const Shimmer = ({ style }: { style?: any }) => (
  <ShimmerPlaceholder
    LinearGradient={LinearGradient}
    style={[{ borderRadius: 8, backgroundColor: '#e0e0e0' }, style]}
    shimmerColors={['#e0e0e0', '#f0f0f0', '#e0e0e0']}
  />
);

export default function DealDetailsSkeleton() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  
  const ActionCardSkeleton = () => (
    <View style={styles.actionCard}>
      {isDesktop && <Shimmer style={styles.desktopCardImage} />}
      {isDesktop && (
        <View style={styles.thumbnailContainer}>
          <Shimmer style={styles.thumbnail} />
          <Shimmer style={styles.thumbnail} />
          <Shimmer style={styles.thumbnail} />
        </View>
      )}
      <View style={styles.priceSection}>
        <Shimmer style={{ width: 120, height: 36 }} />
        <Shimmer style={{ width: 80, height: 20, marginLeft: 12 }} />
      </View>
      <Shimmer style={styles.ctaButton} />
      <View style={styles.secondaryActions}>
        <Shimmer style={{ width: 60, height: 30 }} />
        <Shimmer style={{ width: 60, height: 30 }} />
        <Shimmer style={{ width: 30, height: 30, borderRadius: 15 }} />
        <Shimmer style={{ width: 30, height: 30, borderRadius: 15 }} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Shimmer style={styles.headerImageBackground} />

        <View style={styles.mainContent}>
          <View style={[styles.card, isDesktop && styles.desktopContainer]}>
            <View style={isDesktop && styles.desktopDetailsColumn}>
              <Shimmer style={{ width: 150, height: 20, marginBottom: 12 }} />
              <Shimmer style={{ width: '90%', height: 30, marginBottom: 8 }} />
              <Shimmer style={{ width: '70%', height: 30, marginBottom: 24 }} />

              <View style={styles.metaGrid}>
                <Shimmer style={{ width: 180, height: 24, marginRight: 16 }} />
                <Shimmer style={{ width: 120, height: 24 }} />
              </View>

              {!isDesktop && <ActionCardSkeleton />}

              <View style={styles.descriptionSection}>
                <Shimmer style={{ width: 200, height: 24, marginBottom: 16 }} />
                <Shimmer style={{ width: '100%', height: 18, marginBottom: 8 }} />
                <Shimmer style={{ width: '100%', height: 18, marginBottom: 8 }} />
                <Shimmer style={{ width: '80%', height: 18, marginBottom: 8 }} />
              </View>

              <View style={styles.commentsSection}>
                <Shimmer style={{ width: 180, height: 24, marginBottom: 16 }} />
                <Shimmer style={{ width: '100%', height: 60, marginBottom: 12 }} />
                <Shimmer style={{ width: '100%', height: 60, marginBottom: 12 }} />
              </View>
            </View>

            {isDesktop && (
              <View style={styles.desktopActionColumn}>
                <ActionCardSkeleton />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Using styles from the original component for consistency
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerImageBackground: { height: 250, backgroundColor: '#e0e0e0' },
  mainContent: { padding: 16, marginTop: -60, zIndex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 16 },
  actionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbnailContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  priceSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap' },
  ctaButton: { borderRadius: 12, height: 54, marginBottom: 16 },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  descriptionSection: { marginBottom: 24 },
  commentsSection: {},
  desktopContainer: { flexDirection: 'row', flex: 1, padding: 0, backgroundColor: 'transparent' },
  desktopDetailsColumn: { flex: 3, paddingRight: 24 },
  desktopActionColumn: {
    flex: 2,
    position: 'sticky',
    top: 16,
  },
  desktopCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
});