import Svg, { Rect } from 'react-native-svg';

interface Props {
  size?: number;
  /** 'light' = weißer Hintergrund + dunkle Squares (wie auf finclue.de Navbar)
   *  'dark'  = dunkler Hintergrund + weiße Squares (für dunkle Screens) */
  variant?: 'light' | 'dark';
}

export default function FinclueIcon({ size = 64, variant = 'dark' }: Props) {
  const bg = variant === 'dark' ? '#0F172A' : '#ffffff';
  const sq = variant === 'dark' ? '#ffffff' : '#1a1a1a';
  const border = variant === 'dark' ? '#1E293B' : 'transparent';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Outer rounded background */}
      <Rect x="0" y="0" width="100" height="100" rx="20" fill={bg} stroke={border} strokeWidth="2" />
      {/* Top-left square */}
      <Rect x="16" y="16" width="30" height="30" rx="6" fill={sq} />
      {/* Top-right square */}
      <Rect x="54" y="16" width="30" height="30" rx="6" fill={sq} />
      {/* Bottom-left square */}
      <Rect x="16" y="54" width="30" height="30" rx="6" fill={sq} />
    </Svg>
  );
}
