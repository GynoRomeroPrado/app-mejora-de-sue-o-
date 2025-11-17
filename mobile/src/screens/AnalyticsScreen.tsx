import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchAnalytics } from '@/store/slices/sleepSlice';
import { Colors, Spacing, Typography, BorderRadius } from '@/theme';
import { SleepPhase } from '@/types';

const { width } = Dimensions.get('window');

type PeriodType = 'week' | 'month' | 'year';

const AnalyticsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { analytics, isLoading } = useAppSelector((state) => state.sleep);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = () => {
    dispatch(fetchAnalytics(selectedPeriod));
  };

  const phaseColors = {
    [SleepPhase.AWAKE]: Colors.sleep.awake,
    [SleepPhase.REM]: Colors.sleep.rem,
    [SleepPhase.LIGHT]: Colors.sleep.light,
    [SleepPhase.DEEP]: Colors.sleep.deep,
  };

  const phaseLabels = {
    [SleepPhase.AWAKE]: 'Despierto',
    [SleepPhase.REM]: 'REM',
    [SleepPhase.LIGHT]: 'Ligero',
    [SleepPhase.DEEP]: 'Profundo',
  };

  if (!analytics) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando analytics...</Text>
      </View>
    );
  }

  // Prepare pie chart data
  const pieData = Object.entries(analytics.phaseDistribution).map(([phase, value]) => ({
    name: phaseLabels[phase as SleepPhase],
    population: value,
    color: phaseColors[phase as SleepPhase],
    legendFontColor: Colors.dark.text.secondary,
    legendFontSize: 12,
  }));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Análisis del Sueño</Text>

        {/* Period selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as PeriodType[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{analytics.averageSleepScore}</Text>
          <Text style={styles.summaryLabel}>Puntuación Promedio</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {Math.floor(analytics.averageDuration / 60)}h {analytics.averageDuration % 60}m
          </Text>
          <Text style={styles.summaryLabel}>Duración Media</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{analytics.averageEfficiency}%</Text>
          <Text style={styles.summaryLabel}>Eficiencia</Text>
        </View>
      </View>

      {/* Sleep Score Trend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tendencia de Puntuación</Text>
        <LineChart
          data={{
            labels: analytics.trends.sleepScore.slice(-7).map((_, i) =>
              ['D', 'L', 'M', 'X', 'J', 'V', 'S'][i]
            ),
            datasets: [
              {
                data: analytics.trends.sleepScore.slice(-7).map((t) => t.value),
              },
            ],
          }}
          width={width - Spacing.lg * 2}
          height={220}
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
      </View>

      {/* Sleep Duration Trend */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Duración del Sueño</Text>
        <BarChart
          data={{
            labels: analytics.trends.duration.slice(-7).map((_, i) =>
              ['D', 'L', 'M', 'X', 'J', 'V', 'S'][i]
            ),
            datasets: [
              {
                data: analytics.trends.duration.slice(-7).map((t) => t.value / 60), // Convert to hours
              },
            ],
          }}
          width={width - Spacing.lg * 2}
          height={220}
          chartConfig={{
            backgroundColor: Colors.dark.surface,
            backgroundGradientFrom: Colors.dark.surface,
            backgroundGradientTo: Colors.dark.surfaceVariant,
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(184, 193, 232, ${opacity})`,
          }}
          style={styles.chart}
          yAxisSuffix="h"
        />
      </View>

      {/* Phase Distribution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribución de Fases</Text>
        <PieChart
          data={pieData}
          width={width - Spacing.lg * 2}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
        <View style={styles.phaseLabelsContainer}>
          {Object.entries(analytics.phaseDistribution).map(([phase, value]) => (
            <View key={phase} style={styles.phaseLabelItem}>
              <View
                style={[
                  styles.phaseLabelDot,
                  { backgroundColor: phaseColors[phase as SleepPhase] },
                ]}
              />
              <Text style={styles.phaseLabelText}>
                {phaseLabels[phase as SleepPhase]}: {value.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Sleep Events */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Eventos del Sueño</Text>
        {Object.entries(analytics.eventCounts).map(([eventType, count]) => (
          <View key={eventType} style={styles.eventItem}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventIcon}>{getEventIcon(eventType)}</Text>
              <Text style={styles.eventType}>{getEventLabel(eventType)}</Text>
            </View>
            <Text style={styles.eventCount}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Insights */}
      {analytics.insights && analytics.insights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Observaciones</Text>
          {analytics.insights.map((insight) => (
            <View key={insight.id} style={styles.insightItem}>
              <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.actionable && insight.actions && (
                  <View style={styles.insightActions}>
                    {insight.actions.map((action, index) => (
                      <Text key={index} style={styles.insightAction}>
                        • {action}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Helper functions
const getEventIcon = (type: string): string => {
  const icons: Record<string, string> = {
    snoring: '😴',
    apnea: '⚠️',
    movement: '💫',
    awakening: '👀',
  };
  return icons[type.toLowerCase()] || '📊';
};

const getEventLabel = (type: string): string => {
  const labels: Record<string, string> = {
    snoring: 'Ronquidos',
    apnea: 'Apnea',
    movement: 'Movimientos',
    awakening: 'Despertares',
  };
  return labels[type.toLowerCase()] || type;
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
  loadingText: {
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.dark.text.primary,
    marginBottom: Spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  periodButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.secondary,
  },
  periodButtonTextActive: {
    color: Colors.dark.text.primary,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.primary[400],
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
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
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  phaseLabelsContainer: {
    marginTop: Spacing.md,
  },
  phaseLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  phaseLabelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  phaseLabelText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.dark.text.secondary,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.outline,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  eventType: {
    fontSize: Typography.fontSize.base,
    color: Colors.dark.text.primary,
  },
  eventCount: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.primary[400],
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.dark.surfaceVariant,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.sm,
  },
  insightActions: {
    marginTop: Spacing.sm,
  },
  insightAction: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary[400],
    lineHeight: 20,
  },
  bottomSpacer: {
    height: Spacing['2xl'],
  },
});

export default AnalyticsScreen;
