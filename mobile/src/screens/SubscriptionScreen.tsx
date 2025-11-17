import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { createCheckoutSession, cancelSubscription } from '../store/slices/subscriptionSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Linking } from 'react-native';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  priceId: string;
  features: string[];
  highlighted?: boolean;
  icon: string;
  color: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'FREE',
    name: 'Gratuito',
    price: 0,
    period: 'siempre',
    priceId: '',
    icon: 'moon-waning-crescent',
    color: '#6B7280',
    features: [
      'Grabación de audio básica',
      'Análisis de fases del sueño',
      'Historial de 7 días',
      'Puntuación de sueño',
      'Insights básicos',
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 9.99,
    period: 'mes',
    priceId: 'price_premium_monthly',
    icon: 'star',
    color: '#6366F1',
    highlighted: true,
    features: [
      'Todo lo de Gratuito',
      'Detección de ronquidos y apnea',
      'Predicciones con IA',
      'Historial ilimitado',
      'Exportación de datos',
      'Insights avanzados',
      'Recomendaciones personalizadas',
      'Soporte prioritario',
    ],
  },
  {
    id: 'FAMILY',
    name: 'Familiar',
    price: 14.99,
    period: 'mes',
    priceId: 'price_family_monthly',
    icon: 'account-group',
    color: '#8B5CF6',
    features: [
      'Todo lo de Premium',
      'Hasta 6 miembros',
      'Dashboard familiar',
      'Alertas grupales',
      'Comparativas familiares',
      'Perfiles personalizados',
      'Control parental',
    ],
  },
  {
    id: 'CORPORATE',
    name: 'Corporativo',
    price: 299,
    period: 'mes',
    priceId: 'price_corporate_monthly',
    icon: 'office-building',
    color: '#10B981',
    features: [
      'Todo lo de Familiar',
      'Hasta 50 empleados',
      'Dashboard ejecutivo',
      'Analytics de burnout',
      'Reportes de bienestar',
      'API empresarial',
      'Integración SSO',
      'Soporte dedicado 24/7',
      'Capacitación incluida',
    ],
  },
];

const SubscriptionScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { subscription, isLoading } = useAppSelector((state) => state.subscription);

  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const currentTier = user?.subscriptionTier || 'FREE';

  const handleSubscribe = async (tier: PricingTier) => {
    if (tier.id === 'FREE') {
      Alert.alert('Info', 'Ya estás en el plan gratuito');
      return;
    }

    if (tier.id === currentTier) {
      Alert.alert('Info', 'Ya estás suscrito a este plan');
      return;
    }

    try {
      const result = await dispatch(
        createCheckoutSession({
          priceId: tier.priceId,
          tier: tier.id,
        })
      ).unwrap();

      // Open Stripe checkout in browser
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el proceso de suscripción');
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar suscripción',
      'Tu suscripción permanecerá activa hasta el final del período de facturación actual. ¿Deseas continuar?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(cancelSubscription()).unwrap();
              Alert.alert(
                'Suscripción cancelada',
                'Tu suscripción ha sido cancelada. Podrás seguir usando las funciones premium hasta el final del período actual.'
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudo cancelar la suscripción');
            }
          },
        },
      ]
    );
  };

  const handleManageBilling = async () => {
    try {
      // Open customer portal
      const portalUrl = await dispatch(createCustomerPortalSession()).unwrap();
      if (portalUrl) {
        await Linking.openURL(portalUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el portal de facturación');
    }
  };

  const renderPricingCard = (tier: PricingTier) => {
    const isCurrentTier = tier.id === currentTier;
    const canUpgrade =
      (currentTier === 'FREE' && tier.id !== 'FREE') ||
      (currentTier === 'PREMIUM' && ['FAMILY', 'CORPORATE'].includes(tier.id)) ||
      (currentTier === 'FAMILY' && tier.id === 'CORPORATE');

    return (
      <View
        key={tier.id}
        style={[
          styles.pricingCard,
          tier.highlighted && styles.pricingCardHighlighted,
          isCurrentTier && styles.pricingCardCurrent,
        ]}
      >
        {tier.highlighted && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Más Popular</Text>
          </View>
        )}

        <View style={[styles.tierIcon, { backgroundColor: `${tier.color}20` }]}>
          <Icon name={tier.icon} size={32} color={tier.color} />
        </View>

        <Text style={styles.tierName}>{tier.name}</Text>

        <View style={styles.priceContainer}>
          {tier.price > 0 ? (
            <>
              <Text style={styles.priceSymbol}>€</Text>
              <Text style={styles.priceValue}>{tier.price}</Text>
              <Text style={styles.pricePeriod}>/{tier.period}</Text>
            </>
          ) : (
            <Text style={styles.priceFree}>Gratis</Text>
          )}
        </View>

        {isCurrentTier && (
          <View style={styles.currentBadge}>
            <Icon name="check-circle" size={16} color="#10B981" />
            <Text style={styles.currentBadgeText}>Plan Actual</Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Icon name="check" size={18} color={tier.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {canUpgrade && (
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: tier.color },
              tier.highlighted && styles.subscribeButtonHighlighted,
            ]}
            onPress={() => handleSubscribe(tier)}
            disabled={isLoading}
          >
            <Text style={styles.subscribeButtonText}>
              {isLoading ? 'Procesando...' : 'Mejorar Plan'}
            </Text>
          </TouchableOpacity>
        )}

        {isCurrentTier && tier.id !== 'FREE' && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageBilling}
          >
            <Icon name="cog" size={18} color="#6366F1" />
            <Text style={styles.manageButtonText}>Gestionar Suscripción</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Elige tu plan</Text>
        <Text style={styles.headerSubtitle}>
          Desbloquea todo el potencial de SleepWise
        </Text>
      </View>

      {/* Current Subscription Info */}
      {subscription && currentTier !== 'FREE' && (
        <View style={styles.currentSubscription}>
          <View style={styles.subscriptionHeader}>
            <Icon name="information" size={24} color="#6366F1" />
            <Text style={styles.subscriptionTitle}>Tu Suscripción</Text>
          </View>

          <View style={styles.subscriptionInfo}>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Plan actual:</Text>
              <Text style={styles.subscriptionValue}>
                {PRICING_TIERS.find((t) => t.id === currentTier)?.name}
              </Text>
            </View>

            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Estado:</Text>
              <View style={styles.statusBadge}>
                <Icon
                  name={subscription.status === 'active' ? 'check-circle' : 'clock'}
                  size={14}
                  color={subscription.status === 'active' ? '#10B981' : '#F59E0B'}
                />
                <Text
                  style={[
                    styles.statusText,
                    subscription.status === 'active'
                      ? styles.statusActive
                      : styles.statusPending,
                  ]}
                >
                  {subscription.status === 'active' ? 'Activa' : 'Pendiente'}
                </Text>
              </View>
            </View>

            {subscription.currentPeriodEnd && (
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Próxima renovación:</Text>
                <Text style={styles.subscriptionValue}>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    'es-ES'
                  )}
                </Text>
              </View>
            )}
          </View>

          {subscription.status === 'active' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
            >
              <Icon name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancelar Suscripción</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Pricing Cards */}
      <View style={styles.pricingContainer}>
        {PRICING_TIERS.map(renderPricingCard)}
      </View>

      {/* Features Comparison */}
      <View style={styles.comparisonSection}>
        <Text style={styles.comparisonTitle}>Comparativa de características</Text>
        <Text style={styles.comparisonSubtitle}>
          Todos los planes incluyen:
        </Text>
        <View style={styles.comparisonFeatures}>
          <View style={styles.comparisonFeature}>
            <Icon name="shield-check" size={20} color="#10B981" />
            <Text style={styles.comparisonFeatureText}>
              Cifrado end-to-end
            </Text>
          </View>
          <View style={styles.comparisonFeature}>
            <Icon name="cellphone-lock" size={20} color="#10B981" />
            <Text style={styles.comparisonFeatureText}>
              Datos 100% privados
            </Text>
          </View>
          <View style={styles.comparisonFeature}>
            <Icon name="cloud-sync" size={20} color="#10B981" />
            <Text style={styles.comparisonFeatureText}>
              Sincronización automática
            </Text>
          </View>
          <View style={styles.comparisonFeature}>
            <Icon name="update" size={20} color="#10B981" />
            <Text style={styles.comparisonFeatureText}>
              Actualizaciones gratuitas
            </Text>
          </View>
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Preguntas frecuentes</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>
            ¿Puedo cambiar de plan en cualquier momento?
          </Text>
          <Text style={styles.faqAnswer}>
            Sí, puedes mejorar o degradar tu plan en cualquier momento. Los cambios
            se aplicarán inmediatamente y ajustaremos el cargo proporcionalmente.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>
            ¿Hay período de prueba gratuito?
          </Text>
          <Text style={styles.faqAnswer}>
            Sí, todos los planes de pago incluyen 7 días de prueba gratuita. No se
            te cobrará hasta que termine el período de prueba.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>¿Puedo cancelar en cualquier momento?</Text>
          <Text style={styles.faqAnswer}>
            Sí, puedes cancelar tu suscripción en cualquier momento. Mantendrás el
            acceso hasta el final de tu período de facturación actual.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>
            ¿Ofrecen descuentos para empresas?
          </Text>
          <Text style={styles.faqAnswer}>
            Sí, para organizaciones con más de 50 empleados ofrecemos planes
            personalizados con descuentos. Contacta con nuestro equipo de ventas.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ¿Necesitas ayuda? Contacta con soporte
        </Text>
        <TouchableOpacity>
          <Text style={styles.footerLink}>soporte@sleepwise.com</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  currentSubscription: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subscriptionInfo: {
    gap: 12,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  subscriptionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    color: '#10B981',
  },
  statusPending: {
    color: '#F59E0B',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  pricingContainer: {
    padding: 16,
    gap: 16,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  pricingCardHighlighted: {
    borderColor: '#6366F1',
    transform: [{ scale: 1.02 }],
  },
  pricingCardCurrent: {
    borderColor: '#10B981',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tierIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1F2937',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  priceFree: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  currentBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonHighlighted: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderRadius: 8,
  },
  manageButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonSection: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  comparisonFeatures: {
    gap: 12,
  },
  comparisonFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  comparisonFeatureText: {
    fontSize: 14,
    color: '#374151',
  },
  faqSection: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
});

export default SubscriptionScreen;
