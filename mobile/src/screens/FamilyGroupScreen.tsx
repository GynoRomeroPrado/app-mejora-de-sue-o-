import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchFamilyGroup,
  createFamilyGroup,
  inviteMember,
  removeMember,
  leaveFamilyGroup,
} from '../store/slices/familySlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  role: 'ADMIN' | 'MEMBER';
  lastSleepScore?: number;
  avgSleepHours?: number;
  joinedAt: string;
}

const FamilyGroupScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { familyGroup, members, isLoading } = useAppSelector(
    (state) => state.family
  );
  const { user } = useAppSelector((state) => state.auth);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (user?.familyGroupId) {
      dispatch(fetchFamilyGroup(user.familyGroupId));
    }
  }, [user?.familyGroupId]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el grupo');
      return;
    }

    try {
      await dispatch(createFamilyGroup({ name: groupName })).unwrap();
      setShowCreateModal(false);
      setGroupName('');
      Alert.alert('Éxito', 'Grupo familiar creado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el grupo familiar');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Por favor ingresa un correo electrónico');
      return;
    }

    try {
      await dispatch(
        inviteMember({
          groupId: familyGroup!.id,
          email: inviteEmail,
        })
      ).unwrap();
      setShowInviteModal(false);
      setInviteEmail('');
      Alert.alert('Éxito', 'Invitación enviada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la invitación');
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Eliminar miembro',
      `¿Estás seguro de que quieres eliminar a ${memberName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(
                removeMember({
                  groupId: familyGroup!.id,
                  memberId,
                })
              ).unwrap();
              Alert.alert('Éxito', 'Miembro eliminado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el miembro');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Abandonar grupo',
      '¿Estás seguro de que quieres abandonar este grupo familiar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abandonar',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(leaveFamilyGroup(familyGroup!.id)).unwrap();
              Alert.alert('Éxito', 'Has abandonado el grupo familiar');
            } catch (error) {
              Alert.alert('Error', 'No se pudo abandonar el grupo');
            }
          },
        },
      ]
    );
  };

  const isAdmin = members?.find((m) => m.id === user?.id)?.role === 'ADMIN';

  // No family group
  if (!familyGroup) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="account-group-outline" size={80} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No tienes un grupo familiar</Text>
        <Text style={styles.emptySubtitle}>
          Crea un grupo para compartir y monitorear el sueño de tu familia
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Crear Grupo Familiar</Text>
        </TouchableOpacity>

        {/* Create Group Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Crear Grupo Familiar</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre del grupo (ej: Familia García)"
                value={groupName}
                onChangeText={setGroupName}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setShowCreateModal(false);
                    setGroupName('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.modalConfirmText}>Crear</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Calculate group stats
  const avgGroupScore =
    members && members.length > 0
      ? members.reduce((sum, m) => sum + (m.lastSleepScore || 0), 0) /
        members.length
      : 0;

  const avgGroupHours =
    members && members.length > 0
      ? members.reduce((sum, m) => sum + (m.avgSleepHours || 0), 0) /
        members.length
      : 0;

  const renderMember = ({ item }: { item: FamilyMember }) => {
    const scoreColor =
      (item.lastSleepScore || 0) >= 80
        ? '#10B981'
        : (item.lastSleepScore || 0) >= 70
        ? '#F59E0B'
        : '#EF4444';

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberLeft}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.memberAvatar} />
          ) : (
            <View style={styles.memberAvatarPlaceholder}>
              <Icon name="account" size={24} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.memberInfo}>
            <View style={styles.memberNameRow}>
              <Text style={styles.memberName}>{item.name}</Text>
              {item.role === 'ADMIN' && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberEmail}>{item.email}</Text>
            <View style={styles.memberStats}>
              <View style={styles.memberStat}>
                <Icon name="clock-outline" size={14} color="#6B7280" />
                <Text style={styles.memberStatText}>
                  {item.avgSleepHours?.toFixed(1) || 0}h promedio
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.memberRight}>
          {item.lastSleepScore ? (
            <View style={styles.scoreContainer}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>
                {item.lastSleepScore}
              </Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>Sin datos</Text>
          )}

          {isAdmin && item.id !== user?.id && (
            <TouchableOpacity
              onPress={() => handleRemoveMember(item.id, item.name)}
              style={styles.removeButton}
            >
              <Icon name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Group Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.groupName}>{familyGroup.name}</Text>
            <Text style={styles.memberCount}>
              {members?.length || 0} miembro{members?.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteModal(true)}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="chart-line" size={24} color="#6366F1" />
            <Text style={styles.statValue}>{avgGroupScore.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Score Promedio</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="clock-outline" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{avgGroupHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Horas Promedio</Text>
          </View>
        </View>
      </View>

      {/* Weekly Trend */}
      {familyGroup.weeklyTrend && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Tendencia Grupal</Text>
          <LineChart
            data={{
              labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
              datasets: [
                {
                  data: familyGroup.weeklyTrend,
                },
              ],
            }}
            width={screenWidth - 32}
            height={200}
            chartConfig={{
              backgroundColor: '#6366F1',
              backgroundGradientFrom: '#6366F1',
              backgroundGradientTo: '#8B5CF6',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#FFFFFF',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Members List */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Miembros</Text>
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
          <Icon name="exit-to-app" size={20} color="#EF4444" />
          <Text style={styles.leaveButtonText}>Abandonar Grupo</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invitar Miembro</Text>
            <Text style={styles.modalSubtitle}>
              Enviaremos una invitación por correo electrónico
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="correo@ejemplo.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleInviteMember}
              >
                <Text style={styles.modalConfirmText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  memberCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  chartSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  membersSection: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  memberEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  memberStats: {
    marginTop: 8,
  },
  memberStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberStatText: {
    fontSize: 12,
    color: '#6B7280',
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  noDataText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  removeButton: {
    marginTop: 4,
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  leaveButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#6366F1',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FamilyGroupScreen;
