import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'react-native';

import { useAppContext } from './src/context/AppContext';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

function RootComponent() {
  const { isLoading, isAuthenticated, performAuthentication, theme } = useAppContext();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme?.background || '#fff' }}>
        <ActivityIndicator size="large" color={theme?.primary || '#2196f3'} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 20 }}>App Locked</Text>
        <TouchableOpacity 
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={performAuthentication}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar barStyle="default" />
        <RootComponent />
      </AppProvider>
    </SafeAreaProvider>
  );
}