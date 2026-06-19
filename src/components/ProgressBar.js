import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppContext } from '../context/AppContext';

export default function ProgressBar({ progress, color, height = 8, style }) {
  const { theme } = useAppContext();
  // Ensure progress is between 0 and 100
  const validProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.border, height }, style]}>
      <View 
        style={[
          styles.fill, 
          { 
            backgroundColor: color || theme.primary,
            width: `${validProgress}%`,
            height 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  }
});
