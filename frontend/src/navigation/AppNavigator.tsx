/**
 * Main App Navigator (authenticated users)
 * Bottom tab navigation with Home, Analyze, History, Settings
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

import HomeScreen from '../screens/HomeScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import CallerIDScreen from '../screens/CallerIDScreen';
import TopSpamScreen from '../screens/TopSpamScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MessageDetailScreen from '../screens/MessageDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MessageDetail"
        component={MessageDetailScreen}
        options={{ title: 'Message Details' }}
      />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="HistoryMain"
        component={HistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MessageDetail"
        component={MessageDetailScreen}
        options={{ title: 'Message Details' }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}

function CallerIDStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="CallerIDMain"
        component={CallerIDScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TopSpam"
        component={TopSpamScreen}
        options={{ title: 'Top Spam Numbers' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Analyze':
              iconName = focused ? 'scan' : 'scan-outline';
              break;
            case 'CallerID':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: t('home') }}
      />
      <Tab.Screen
        name="Analyze"
        component={AnalyzeScreen}
        options={{ tabBarLabel: t('analyze') }}
      />
      <Tab.Screen
        name="CallerID"
        component={CallerIDStack}
        options={{ tabBarLabel: 'Caller ID' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{ tabBarLabel: t('history') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{ tabBarLabel: t('settings') }}
      />
    </Tab.Navigator>
  );
}
