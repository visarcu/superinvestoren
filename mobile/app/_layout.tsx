import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/auth';
import '../global.css';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#020617" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="stock/[ticker]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
      </Stack>
    </>
  );
}
