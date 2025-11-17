import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../store';

// Screens
import HomeScreen from '../screens/HomeScreen';
import SleepRecordingScreen from '../screens/SleepRecordingScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SleepHistoryScreen from '../screens/SleepHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FamilyGroupScreen from '../screens/FamilyGroupScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Recording: undefined;
  History: undefined;
  Analytics: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  Settings: undefined;
  FamilyGroup: undefined;
  Subscription: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Bottom Tab Navigator
function TabNavigator() {
  return (
    <AppTabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Recording':
              iconName = focused ? 'moon-waning-crescent' : 'moon-waning-crescent';
              break;
            case 'History':
              iconName = focused ? 'history' : 'history';
              break;
            case 'Analytics':
              iconName = focused ? 'chart-box' : 'chart-box-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#1F2937',
        },
      })}
    >
      <AppTabs.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
        }}
      />
      <AppTabs.Screen
        name="Recording"
        component={SleepRecordingScreen}
        options={{
          title: 'Grabar',
          tabBarLabel: 'Grabar',
          headerShown: false,
        }}
      />
      <AppTabs.Screen
        name="History"
        component={SleepHistoryScreen}
        options={{
          title: 'Historial',
          tabBarLabel: 'Historial',
        }}
      />
      <AppTabs.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarLabel: 'Analytics',
        }}
      />
      <AppTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
        }}
      />
    </AppTabs.Navigator>
  );
}

// App Navigator
function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#1F2937',
        },
        headerTintColor: '#6366F1',
        animation: 'slide_from_right',
      }}
    >
      <AppStack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Configuración' }}
      />
      <AppStack.Screen
        name="FamilyGroup"
        component={FamilyGroupScreen}
        options={{ title: 'Grupo Familiar' }}
      />
      <AppStack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Suscripción' }}
      />
    </AppStack.Navigator>
  );
}

// Root Navigator
export default function RootNavigator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
