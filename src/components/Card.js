import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppContext } from '../context/AppContext';

export default function Card({ children, style }) {
  const { theme } = useAppContext();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.text }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }
});
