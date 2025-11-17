import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchSleepHistory, deleteSleepSession } from '../store/slices/sleepSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

interface SleepSession {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  sleepScore: number;
  efficiency: number;
  phases: {
    awake: number;
    rem: number;
    light: number;
    deep: number;
  };
  events: Array<{
    type: string;
    count: number;
  }>;
}

const SleepHistoryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sessions, isLoading } = useAppSelector((state) => state.sleep);
  const { user } = useAppSelector((state) => state.auth);

  const [selectedSession, setSelectedSession] = useState<SleepSession | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    dispatch(fetchSleepHistory({ period: filterPeriod }));
  }, [filterPeriod]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      'Eliminar sesión',
      '¿Estás seguro de que quieres eliminar esta sesión de sueño?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteSleepSession(sessionId)).unwrap();
              setSelectedSession(null);
              Alert.alert('Éxito', 'Sesión eliminada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la sesión');
            }
          },
        },
      ]
    );
  };

  const renderSessionCard = ({ item }: { item: SleepSession }) => {
    const scoreColor = getScoreColor(item.sleepScore);

    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => setSelectedSession(item)}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionDate}>
            <Icon name="calendar" size={16} color="#6B7280" />
            <Text style={styles.sessionDateText}>{formatDate(item.startTime)}</Text>
          </View>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>
              {item.sleepScore}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={18} color="#6B7280" />
            <Text style={styles.detailText}>
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="timer-outline" size={18} color="#6B7280" />
            <Text style={styles.detailText}>
              {formatDuration(item.duration)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="chart-line" size={18} color="#6B7280" />
            <Text style={styles.detailText}>{item.efficiency}% eficiencia</Text>
          </View>
        </View>

        <View style={styles.phaseIndicators}>
          {item.phases.deep > 0 && (
            <View style={styles.phaseChip}>
              <View style={[styles.phaseDot, { backgroundColor: '#312E81' }]} />
              <Text style={styles.phaseChipText}>
                {Math.round(item.phases.deep)}m profundo
              </Text>
            </View>
          )}
          {item.phases.rem > 0 && (
            <View style={styles.phaseChip}>
              <View style={[styles.phaseDot, { backgroundColor: '#6366F1' }]} />
              <Text style={styles.phaseChipText}>
                {Math.round(item.phases.rem)}m REM
              </Text>
            </View>
          )}
        </View>

        {item.events && item.events.length > 0 && (
          <View style={styles.eventsContainer}>
            {item.events.map((event, index) => (
              <View key={index} style={styles.eventChip}>
                <Icon
                  name={
                    event.type === 'SNORING'
                      ? 'volume-high'
                      : event.type === 'APNEA'
                      ? 'alert'
                      : 'motion'
                  }
                  size={12}
                  color="#EF4444"
                />
                <Text style={styles.eventText}>
                  {event.count} {event.type.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="sleep" size={80} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No hay sesiones de sueño</Text>
      <Text style={styles.emptySubtitle}>
        Comienza a grabar tu sueño para ver tu historial aquí
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterPeriod === 'week' && styles.filterTabActive]}
          onPress={() => setFilterPeriod('week')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterPeriod === 'week' && styles.filterTabTextActive,
            ]}
          >
            Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterPeriod === 'month' && styles.filterTabActive]}
          onPress={() => setFilterPeriod('month')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterPeriod === 'month' && styles.filterTabTextActive,
            ]}
          >
            Mes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterPeriod === 'all' && styles.filterTabActive]}
          onPress={() => setFilterPeriod('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterPeriod === 'all' && styles.filterTabTextActive,
            ]}
          >
            Todo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sessions List */}
      <FlatList
        data={sessions}
        renderItem={renderSessionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshing={isLoading}
        onRefresh={() => dispatch(fetchSleepHistory({ period: filterPeriod }))}
      />

      {/* Session Detail Modal */}
      <Modal
        visible={selectedSession !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSession(null)}
      >
        {selectedSession && (
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedSession(null)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Detalles del Sueño</Text>
              <TouchableOpacity
                onPress={() => handleDeleteSession(selectedSession.id)}
                style={styles.deleteButton}
              >
                <Icon name="delete" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Date and Score */}
              <View style={styles.modalScoreSection}>
                <Text style={styles.modalDate}>
                  {formatDate(selectedSession.startTime)}
                </Text>
                <View
                  style={[
                    styles.modalScoreCircle,
                    {
                      borderColor: getScoreColor(selectedSession.sleepScore),
                      backgroundColor: `${getScoreColor(selectedSession.sleepScore)}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalScoreValue,
                      { color: getScoreColor(selectedSession.sleepScore) },
                    ]}
                  >
                    {selectedSession.sleepScore}
                  </Text>
                  <Text style={styles.modalScoreLabel}>Puntuación</Text>
                </View>
              </View>

              {/* Summary Stats */}
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Icon name="clock-outline" size={24} color="#6366F1" />
                  <Text style={styles.summaryValue}>
                    {formatDuration(selectedSession.duration)}
                  </Text>
                  <Text style={styles.summaryLabel}>Duración Total</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Icon name="chart-line" size={24} color="#8B5CF6" />
                  <Text style={styles.summaryValue}>
                    {selectedSession.efficiency}%
                  </Text>
                  <Text style={styles.summaryLabel}>Eficiencia</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Icon name="bed" size={24} color="#10B981" />
                  <Text style={styles.summaryValue}>
                    {formatTime(selectedSession.startTime)}
                  </Text>
                  <Text style={styles.summaryLabel}>Hora de Dormir</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Icon name="weather-sunny" size={24} color="#F59E0B" />
                  <Text style={styles.summaryValue}>
                    {formatTime(selectedSession.endTime)}
                  </Text>
                  <Text style={styles.summaryLabel}>Hora de Despertar</Text>
                </View>
              </View>

              {/* Sleep Phases */}
              <View style={styles.phasesSection}>
                <Text style={styles.sectionTitle}>Fases del Sueño</Text>

                <View style={styles.phasesList}>
                  <View style={styles.phaseItem}>
                    <View
                      style={[styles.phaseBar, { backgroundColor: '#312E81' }]}
                    >
                      <View
                        style={[
                          styles.phaseBarFill,
                          {
                            width: `${
                              (selectedSession.phases.deep /
                                selectedSession.duration) *
                              100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.phaseInfo}>
                      <Text style={styles.phaseName}>Sueño Profundo</Text>
                      <Text style={styles.phaseDuration}>
                        {formatDuration(selectedSession.phases.deep)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.phaseItem}>
                    <View
                      style={[styles.phaseBar, { backgroundColor: '#6366F1' }]}
                    >
                      <View
                        style={[
                          styles.phaseBarFill,
                          {
                            width: `${
                              (selectedSession.phases.rem /
                                selectedSession.duration) *
                              100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.phaseInfo}>
                      <Text style={styles.phaseName}>REM</Text>
                      <Text style={styles.phaseDuration}>
                        {formatDuration(selectedSession.phases.rem)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.phaseItem}>
                    <View
                      style={[styles.phaseBar, { backgroundColor: '#A5B4FC' }]}
                    >
                      <View
                        style={[
                          styles.phaseBarFill,
                          {
                            width: `${
                              (selectedSession.phases.light /
                                selectedSession.duration) *
                              100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.phaseInfo}>
                      <Text style={styles.phaseName}>Sueño Ligero</Text>
                      <Text style={styles.phaseDuration}>
                        {formatDuration(selectedSession.phases.light)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.phaseItem}>
                    <View
                      style={[styles.phaseBar, { backgroundColor: '#F3F4F6' }]}
                    >
                      <View
                        style={[
                          styles.phaseBarFill,
                          {
                            width: `${
                              (selectedSession.phases.awake /
                                selectedSession.duration) *
                              100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.phaseInfo}>
                      <Text style={styles.phaseName}>Despierto</Text>
                      <Text style={styles.phaseDuration}>
                        {formatDuration(selectedSession.phases.awake)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Events */}
              {selectedSession.events && selectedSession.events.length > 0 && (
                <View style={styles.eventsSection}>
                  <Text style={styles.sectionTitle}>Eventos Detectados</Text>
                  <View style={styles.eventsList}>
                    {selectedSession.events.map((event, index) => (
                      <View key={index} style={styles.eventItem}>
                        <View style={styles.eventIconContainer}>
                          <Icon
                            name={
                              event.type === 'SNORING'
                                ? 'volume-high'
                                : event.type === 'APNEA'
                                ? 'alert'
                                : 'motion'
                            }
                            size={24}
                            color={
                              event.type === 'APNEA' ? '#EF4444' : '#F59E0B'
                            }
                          />
                        </View>
                        <View style={styles.eventDetails}>
                          <Text style={styles.eventType}>
                            {event.type === 'SNORING'
                              ? 'Ronquidos'
                              : event.type === 'APNEA'
                              ? 'Apnea'
                              : 'Movimientos'}
                          </Text>
                          <Text style={styles.eventCount}>
                            {event.count} evento{event.count !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#6366F1',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  sessionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  phaseIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseChipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  eventText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  deleteButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalScoreSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  modalDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  modalScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScoreValue: {
    fontSize: 48,
    fontWeight: '700',
  },
  modalScoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  phasesSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  phasesList: {
    gap: 16,
  },
  phaseItem: {
    gap: 8,
  },
  phaseBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  phaseBarFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  phaseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phaseName: {
    fontSize: 14,
    color: '#6B7280',
  },
  phaseDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  eventsList: {
    gap: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  eventIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    flex: 1,
  },
  eventType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default SleepHistoryScreen;
