import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

export default function GoogleIcon({ size = 20 }) {
  return (
    <View style={styles.container}>
      <AntDesign name="google" size={size} color="#4285F4" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
