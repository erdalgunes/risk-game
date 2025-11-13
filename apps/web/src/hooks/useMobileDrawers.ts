import { useState, useEffect } from 'react';
import type { TerritoryId } from '@risk-poc/game-engine';

export type DrawerType = 'stats' | 'action' | 'menu' | null;

export function useMobileDrawers(selectedTerritory: TerritoryId | null) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  // Auto-open action drawer when territory is selected
  useEffect(() => {
    if (selectedTerritory && activeDrawer !== 'action') {
      setActiveDrawer('action');
    }
  }, [selectedTerritory, activeDrawer]);

  const openDrawer = (drawer: DrawerType) => {
    setActiveDrawer(drawer);
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
  };

  const toggleDrawer = (drawer: DrawerType) => {
    setActiveDrawer(activeDrawer === drawer ? null : drawer);
  };

  return {
    activeDrawer,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
