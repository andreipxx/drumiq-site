// DRUMIQ v1.0.0 — Animated robot mascot SVG
// Inspired by user's app icon design (robot helmet + green visor + DP medallion)

import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop, Filter,
  FeGaussianBlur, FeMerge, FeMergeNode,
  Path, Rect, Circle, Ellipse, Line, Text as SvgText, G,
} from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;       // primary color (default green)
  glowing?: boolean;    // antenna pulse
}

export default function AppMascot({ size = 140, color = '#00FF88', glowing = true }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!glowing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowing, pulse]);

  const colorDim = color + '88';
  const colorAlpha22 = color + '22';

  return (
    <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
        <Defs>
          <LinearGradient id="helmet" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1A2218" />
            <Stop offset="100%" stopColor="#0A0E0B" />
          </LinearGradient>
          <LinearGradient id="visor" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.5} />
          </LinearGradient>
          <RadialGradient id="eyeGlow">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Floor shadow */}
        <Ellipse cx="100" cy="210" rx="55" ry="6" fill={color} opacity="0.15" />

        {/* Body lower (chest) */}
        <Path
          d="M 60 140 Q 60 200 100 200 Q 140 200 140 140 L 140 130 Q 140 125 135 125 L 65 125 Q 60 125 60 130 Z"
          fill="url(#helmet)"
          stroke={colorDim}
          strokeWidth="1.5"
        />

        {/* Chest line */}
        <Rect x="98" y="140" width="4" height="55" fill={color} opacity="0.7" />

        {/* DP medallion */}
        <Circle cx="100" cy="160" r="12" fill="#0A0E0B" stroke={color} strokeWidth="1.5" />
        <SvgText
          x="100" y="165"
          textAnchor="middle"
          fill={color}
          fontFamily="sans-serif"
          fontSize="11"
          fontWeight="900"
        >D</SvgText>

        {/* Neck connector */}
        <Rect x="88" y="115" width="24" height="14" fill="#1A2218" stroke="#1E2A1F" />

        {/* Head/helmet */}
        <Path
          d="M 50 90 Q 50 30 100 30 Q 150 30 150 90 L 150 110 Q 150 120 140 120 L 60 120 Q 50 120 50 110 Z"
          fill="url(#helmet)"
          stroke={colorDim}
          strokeWidth="1.5"
        />

        {/* Helmet center stripe */}
        <Path d="M 95 30 Q 100 28 105 30 L 105 95 L 95 95 Z" fill={color} opacity="0.85" />

        {/* Visor */}
        <Path
          d="M 65 60 Q 65 50 75 50 L 125 50 Q 135 50 135 60 L 135 95 Q 135 100 130 100 L 70 100 Q 65 100 65 95 Z"
          fill="url(#visor)"
          stroke={color}
          strokeWidth="1"
        />

        {/* Eyes (glow + pupil) */}
        <Circle cx="83" cy="75" r="8" fill="url(#eyeGlow)" />
        <Circle cx="117" cy="75" r="8" fill="url(#eyeGlow)" />
        <Circle cx="83" cy="75" r="3" fill={color} />
        <Circle cx="117" cy="75" r="3" fill={color} />

        {/* Antenna stem */}
        <Line x1="100" y1="30" x2="100" y2="15" stroke={color} strokeWidth="2" />
      </Svg>

      {/* Animated antenna tip */}
      {glowing && (
        <Animated.View
          style={{
            position: 'absolute',
            top: size * 0.06,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            opacity: pulse,
            shadowColor: color,
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 8,
          }}
        />
      )}
    </View>
  );
}
