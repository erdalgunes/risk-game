import type { TerritoryId } from '@risk-poc/game-engine';

export interface TerritoryPath {
  id: TerritoryId;
  path: string;
  labelPosition: { x: number; y: number };
  name: string;
}

/**
 * SVG path definitions for each territory
 * Designed to create a visually appealing map with organic, territory-like shapes
 */
export const territoryPaths: Record<TerritoryId, TerritoryPath> = {
  1: {
    id: 1,
    path: "M 50,80 Q 40,60 60,50 L 140,40 Q 160,45 170,65 L 165,140 Q 150,155 130,150 L 70,145 Q 50,135 50,110 Z",
    labelPosition: { x: 110, y: 100 },
    name: "Territory 1"
  },
  2: {
    id: 2,
    path: "M 170,65 Q 180,50 200,55 L 280,60 Q 300,70 305,90 L 300,160 Q 285,175 265,170 L 185,165 Q 170,155 165,140 L 170,65 Z",
    labelPosition: { x: 235, y: 115 },
    name: "Territory 2"
  },
  3: {
    id: 3,
    path: "M 305,90 Q 315,75 335,80 L 420,95 Q 440,110 440,135 L 430,185 Q 415,200 395,195 L 315,180 Q 300,170 300,160 L 305,90 Z",
    labelPosition: { x: 370, y: 140 },
    name: "Territory 3"
  },
  4: {
    id: 4,
    path: "M 50,180 Q 45,160 70,145 L 130,150 Q 150,155 165,175 L 170,250 Q 160,275 135,270 L 75,265 Q 55,250 50,225 Z",
    labelPosition: { x: 110, y: 215 },
    name: "Territory 4"
  },
  5: {
    id: 5,
    path: "M 165,175 Q 175,165 185,165 L 265,170 Q 285,175 295,195 L 290,270 Q 275,290 250,285 L 180,280 Q 165,270 170,250 L 165,175 Z",
    labelPosition: { x: 230, y: 230 },
    name: "Territory 5"
  },
  6: {
    id: 6,
    path: "M 295,195 Q 305,185 315,180 L 395,195 Q 415,200 425,220 L 425,290 Q 410,310 385,305 L 310,295 Q 295,285 290,270 L 295,195 Z",
    labelPosition: { x: 360, y: 250 },
    name: "Territory 6"
  }
};

/**
 * Connection line coordinates for drawing borders between adjacent territories
 */
export const connectionLines: Array<{ from: TerritoryId; to: TerritoryId; points: string }> = [
  { from: 1, to: 2, points: "165,100 185,105" },
  { from: 2, to: 3, points: "300,125 315,130" },
  { from: 1, to: 4, points: "90,150 90,175" },
  { from: 2, to: 5, points: "225,165 225,180" },
  { from: 3, to: 6, points: "360,190 360,200" },
  { from: 4, to: 5, points: "165,220 175,225" },
  { from: 5, to: 6, points: "290,240 300,245" }
];
