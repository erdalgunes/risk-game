/**
 * SVG Map Coordinates for Risk Board
 *
 * Defines label positions for each territory on the SVG map.
 * Coordinates are relative to the SVG viewBox (182 114 720 405).
 */

import type { TerritoryName } from '@/types/game';

/**
 * Territory label coordinates (x, y positions for army count overlays)
 * Based on Risk game board SVG from Wikimedia Commons
 */
export const TERRITORY_LABEL_COORDS: Record<TerritoryName, { x: number; y: number }> = {
  // North America
  'alaska': { x: 245, y: 220 },
  'northwest-territory': { x: 280, y: 190 },
  'greenland': { x: 440, y: 175 },
  'alberta': { x: 280, y: 240 },
  'ontario': { x: 330, y: 230 },
  'quebec': { x: 385, y: 235 },
  'western-united-states': { x: 280, y: 280 },
  'eastern-united-states': { x: 340, y: 285 },
  'central-america': { x: 285, y: 340 },

  // South America
  'venezuela': { x: 335, y: 390 },
  'brazil': { x: 380, y: 430 },
  'peru': { x: 335, y: 450 },
  'argentina': { x: 360, y: 520 },

  // Europe
  'iceland': { x: 450, y: 215 },
  'great-britain': { x: 465, y: 260 },
  'scandinavia': { x: 530, y: 210 },
  'northern-europe': { x: 530, y: 265 },
  'western-europe': { x: 490, y: 305 },
  'southern-europe': { x: 550, y: 300 },
  'ukraine': { x: 600, y: 250 },

  // Africa
  'north-africa': { x: 500, y: 360 },
  'egypt': { x: 565, y: 355 },
  'east-africa': { x: 600, y: 395 },
  'congo': { x: 560, y: 430 },
  'south-africa': { x: 580, y: 475 },
  'madagascar': { x: 635, y: 485 },

  // Asia
  'ural': { x: 660, y: 220 },
  'siberia': { x: 710, y: 190 },
  'yakutsk': { x: 770, y: 175 },
  'kamchatka': { x: 825, y: 180 },
  'irkutsk': { x: 750, y: 225 },
  'mongolia': { x: 760, y: 265 },
  'japan': { x: 835, y: 275 },
  'afghanistan': { x: 665, y: 280 },
  'china': { x: 740, y: 305 },
  'middle-east': { x: 620, y: 320 },
  'india': { x: 695, y: 350 },
  'siam': { x: 755, y: 365 },

  // Australia
  'indonesia': { x: 755, y: 420 },
  'new-guinea': { x: 810, y: 425 },
  'western-australia': { x: 780, y: 480 },
  'eastern-australia': { x: 825, y: 475 },
};

/**
 * Convert TerritoryName (hyphenated) to SVG ID format (underscored)
 * Example: 'northwest-territory' -> 'northwest_territory'
 */
export function territoryNameToSvgId(name: TerritoryName): string {
  return name.replace(/-/g, '_');
}

/**
 * Convert SVG ID format (underscored) to TerritoryName (hyphenated)
 * Example: 'northwest_territory' -> 'northwest-territory'
 */
export function svgIdToTerritoryName(id: string): TerritoryName {
  return id.replace(/_/g, '-') as TerritoryName;
}

/**
 * Get the center point for a territory label
 */
export function getTerritoryLabelPosition(name: TerritoryName): { x: number; y: number } {
  const coords = TERRITORY_LABEL_COORDS[name];
  if (!coords) {
    console.warn(`No coordinates defined for territory: ${name}`);
    return { x: 500, y: 300 }; // Fallback to center of map
  }
  return coords;
}

/**
 * SVG viewBox dimensions for the Risk map
 */
export const SVG_VIEWBOX = {
  x: 182,
  y: 114,
  width: 720,
  height: 405,
};
// Test comment
