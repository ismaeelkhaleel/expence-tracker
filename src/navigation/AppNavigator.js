import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

// Import Screens
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import BorrowLendScreen from '../screens/BorrowLendScreen';
import SettingsScreen from '../screens/SettingsScreen';

import AddTransactionScreen from '../screens/AddTransactionScreen';
import AddBorrowLendScreen from '../screens/AddBorrowLendScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { theme } = useAppContext();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Transactions') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Borrow/Lend') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Borrow/Lend" component={BorrowLendScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const { theme } = useAppContext();
  const isDark = theme.background === '#121212';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const customTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.danger,
    }
  };

  return (
    <NavigationContainer theme={customTheme}>
      <Stack.Navigator screenOptions={{ 
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background }
      }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={({ route }) => ({ title: route.params?.type === 'income' ? 'Add Income' : 'Add Expense' })} />
        <Stack.Screen name="AddBorrowLend" component={AddBorrowLendScreen} options={({ route }) => ({ title: route.params?.type === 'lend' ? 'Money I Gave' : 'Money I Owe' })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
