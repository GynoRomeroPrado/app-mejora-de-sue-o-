import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchSleepSessions, fetchAnalytics } from '@/store/slices/sleepSlice';
import { Colors, Spacing, Typography, BorderRadius } from '@/theme';
import { SleepPhase } from '@/types';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessions, analytics, isLoading } = useAppSelector((state) => state.sleep);
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchSleepSessions({ limit: 7 })),
      dispatch(fetchAnalytics('week')),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const lastSession = sessions[0];
  const greeting = getGreeting();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[400]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}, {user?.name?.split(' ')[0]}! ☀️</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })}</Text>
      </View>

      {/* Last Night's Sleep Card */}
      {lastSession && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sueño de Anoche</Text>

          {/* Sleep Score */}
          <View style={styles.scoreContainer}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{lastSession.sleepScore || '--'}</Text>
              <Text style={styles.scoreLabel}>Puntuación</Text>
            </View>
            <Text style={styles.scoreRating}>{getSleepRating(lastSession.sleepScore)}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(lastSession.duration)}</Text>
              <Text style={styles.statLabel}>Duración</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{lastSession.efficiency?.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Eficiencia</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {lastSession.phases?.filter(p => p.phase === SleepPhase.REM).length || 0}
              </Text>
              <Text style={styles.statLabel}>Ciclos REM</Text>
            </View>
          </View>
        </View>
      )}

      {/* Sleep Timeline Chart */}
      {analytics && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tendencia Semanal</Text>
          <LineChart
            data={{
              labels: analytics.trends.sleepScore.slice(-7).map((_, i) =>
                ['D', 'L', 'M', 'X', 'J', 'V', 'S'][i]
              ),
              datasets: [{
                data: analytics.trends.sleepScore.slice(-7).map(t => t.value),
              }],
            }}
            width={width - Spacing.lg * 2}
            height={200}
            chartConfig={{
              backgroundColor: Colors.dark.surface,
              backgroundGradientFrom: Colors.dark.surface,
              backgroundGradientTo: Colors.dark.surfaceVariant,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(184, 193, 232, ${opacity})`,
              style: {
                borderRadius: BorderRadius.lg,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: Colors.primary[500],
              },
            }}
            bezier
            style={styles.chart}
          />
          <Text style={styles.chartCaption}>
            Promedio: {analytics.averageSleepScore.toFixed(0)}
          </Text>
        </View>
      )}

      {/* Insights */}
      {analytics?.insights && analytics.insights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Observaciones</Text>
          {analytics.insights.slice(0, 2).map((insight, index) => (
            <View key={insight.id} style={[styles.insight, index > 0 && styles.insightMargin]}>
              <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>🌙 Iniciar Sesión de Sueño</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>📊 Ver Tendencias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>⏰ Alarma</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Helper functions
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos Días';
  if (hour < 19) return 'Buenas Tardes';
  return 'Buenas Noches';
};

const getSleepRating = (score?: number): string => {
  if (!score) return '';
  if (score >= 90) return '¡Excelente! 🌟';
  if (score >= 80) return 'Muy Bien 😊';
  if (score >= 70) return 'Bien 👍';
  if (score >= 60) return 'Regular 😐';
  return 'Necesita Mejorar 😴';
};

const formatDuration = (minutes?: number): string => {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getInsightIcon = (type: string): string => {
  const icons: Record<string, string> = {
    positive: '💡',
    negative: '⚠️',
    neutral: 'ℹ️',
    warning: '🔔',
  };
  return icons[type] || '💡';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  greeting: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.xs,
  },
  date: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.secondary,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: Colors.dark.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.dark.surfaceVariant,
    borderWidth: 8,
    borderColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scoreValue: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.dark.text.primary,
  },
  scoreLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text.secondary,
    marginTop: Spacing.xs,
  },
  scoreRating: {
    fontSize: Typography.fontSize.lg,
    color: Colors.dark.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.outline,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.dark.outline,
  },
  chart: {
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  chartCaption: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.dark.surfaceVariant,
    borderRadius: BorderRadius.lg,
  },
  insightMargin: {
    marginTop: Spacing.sm,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.xs,
  },
  insightDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text.secondary,
    lineHeight: 20,
  },
  actionsContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.dark.text.primary,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.primary,
  },
  bottomSpacer: {
    height: Spacing['2xl'],
  },
});

export default HomeScreen;
