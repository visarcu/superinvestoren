// src/components/ConditionalHero.tsx
'use client';

import { usePathname } from 'next/navigation';
import Hero from './Hero';

export default function ConditionalHero() {
  const pathname = usePathname();
  return pathname === '/' ? <Hero /> : null;
}