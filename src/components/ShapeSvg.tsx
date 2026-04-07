/**
 * ShapeSvg — renders any shape type as an SVG icon.
 * Used by side campaigns and anywhere shape rendering is needed outside SceneRenderer.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, Ellipse } from 'react-native-svg';

interface Props {
  type: string;
  color: string;
  size: number;
}

function ShapeSvg({ type, color, size }: Props) {
  switch (type) {
    case 'circle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
    case 'square': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={2} width={20} height={20} rx={3} fill={color} /></Svg>;
    case 'triangle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,20 2,20" fill={color} /></Svg>;
    case 'star': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></Svg>;
    case 'diamond': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,12 12,22 2,12" fill={color} /></Svg>;
    case 'hexagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 21.66,7 21.66,17 12,22 2.34,17 2.34,7" fill={color} /></Svg>;
    case 'pentagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22.47,9.51 18.54,21.49 5.46,21.49 1.53,9.51" fill={color} /></Svg>;
    case 'oval': return <Svg width={size} height={size} viewBox="0 0 24 24"><Ellipse cx={12} cy={12} rx={10} ry={7} fill={color} /></Svg>;
    case 'cross': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8,2 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 z" fill={color} /></Svg>;
    case 'arrow': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12,2 L22,12 H16 V22 H8 V12 H2 Z" fill={color} /></Svg>;
    case 'semicircle': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M2,14 A10,10 0 0,1 22,14 Z" fill={color} /></Svg>;
    case 'parallelogram': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="6,4 22,4 18,20 2,20" fill={color} /></Svg>;
    case 'trapezoid': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="6,4 18,4 22,20 2,20" fill={color} /></Svg>;
    case 'rhombus': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 21,12 12,22 3,12" fill={color} /></Svg>;
    case 'kite': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 20,10 12,22 4,10" fill={color} /></Svg>;
    default: return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={color} /></Svg>;
  }
}

export default React.memo(ShapeSvg);
