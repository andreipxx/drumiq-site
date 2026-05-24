declare module '@expo/vector-icons' {
  import React from 'react';
  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }
  export class Ionicons extends React.Component<IconProps> {
    static glyphMap: Record<string, number>;
  }
  export class MaterialIcons extends React.Component<IconProps> {
    static glyphMap: Record<string, number>;
  }
  export class FontAwesome extends React.Component<IconProps> {
    static glyphMap: Record<string, number>;
  }
  export class Feather extends React.Component<IconProps> {
    static glyphMap: Record<string, number>;
  }
  export class MaterialCommunityIcons extends React.Component<IconProps> {
    static glyphMap: Record<string, number>;
  }
}
