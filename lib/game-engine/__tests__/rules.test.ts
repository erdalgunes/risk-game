import { describe, it, expect } from 'vitest';
import {
  calculateReinforcements,
  calculateContinentBonuses,
  ownsContinent,
  isPlayerEliminated,
  getWinner,
  distributeTerritoriesRandomly,
  calculateInitialArmies,
} from '../rules';
import { createTestPlayer } from '@/tests/factories/player';
import { createTestTerritory, createContinentTerritories } from '@/tests/factories/territory';
import { CONTINENTS } from '@/constants/map';
import type { TerritoryName } from '@/types/game';

describe('Game Rules', () => {
  describe('calculateReinforcements', () => {
    it('should return minimum of 3 armies', () => {
      const player = createTestPlayer();
      const territories = [createTestTerritory({ owner_id: player.id })];

      const reinforcements = calculateReinforcements(player, territories);

      expect(reinforcements).toBe(3);
    });

    it('should calculate armies based on territories / 3', () => {
      const player = createTestPlayer();
      // Use specific territories from different continents to avoid accidental continent bonuses
      const territoryNames: TerritoryName[] = [
        'alaska',
        'alberta',
        'central-america', // North America (3/9)
        'brazil',
        'argentina',
        'peru', // South America (3/4)
        'western-europe',
        'northern-europe',
        'southern-europe', // Europe (3/7)
        'egypt',
        'east-africa',
        'congo', // Africa (3/6)
      ];
      const territories = territoryNames.map((name) =>
        createTestTerritory({ owner_id: player.id, territory_name: name })
      );

      const reinforcements = calculateReinforcements(player, territories);

      expect(reinforcements).toBe(4); // 12 / 3 = 4
    });

    it('should round down fractional reinforcements', () => {
      const player = createTestPlayer();
      // Use specific territories from different continents to avoid accidental continent bonuses
      const territoryNames: TerritoryName[] = [
        'alaska',
        'alberta',
        'central-america', // North America (3/9)
        'brazil',
        'argentina',
        'peru', // South America (3/4)
        'western-europe',
        'northern-europe',
        'southern-europe', // Europe (3/7)
        'egypt',
        'east-africa', // Africa (2/6)
      ];
      const territories = territoryNames.map((name) =>
        createTestTerritory({ owner_id: player.id, territory_name: name })
      );

      const reinforcements = calculateReinforcements(player, territories);

      expect(reinforcements).toBe(3); // 11 / 3 = 3.67 → 3
    });

    it('should add continent bonuses to reinforcements', () => {
      const player = createTestPlayer();
      const australiaContinent = CONTINENTS.find((c) => c.name === 'australia')!;
      const territories = createContinentTerritories(
        'game-id',
        australiaContinent.territories,
        player.id
      );

      const reinforcements = calculateReinforcements(player, territories);

      // Australia: 4 territories (4/3 = 1, min 3) + 2 bonus = 5
      expect(reinforcements).toBe(5);
    });

    it('should add multiple continent bonuses', () => {
      const player = createTestPlayer();
      const australia = CONTINENTS.find((c) => c.name === 'australia')!;
      const southAmerica = CONTINENTS.find((c) => c.name === 'south-america')!;

      const territories = [
        ...createContinentTerritories('game-id', australia.territories, player.id),
        ...createContinentTerritories('game-id', southAmerica.territories, player.id),
      ];

      const reinforcements = calculateReinforcements(player, territories);

      // 8 territories (8/3 = 2, min 3) + 2 (Australia) + 2 (South America) = 7
      expect(reinforcements).toBe(7);
    });
  });

  describe('calculateContinentBonuses', () => {
    it('should return 0 if player owns no continents', () => {
      const player = createTestPlayer();
      const territories = [
        createTestTerritory({ owner_id: player.id, territory_name: 'alaska' }),
        createTestTerritory({ owner_id: player.id, territory_name: 'brazil' }),
      ];

      const bonus = calculateContinentBonuses(player.id, territories);

      expect(bonus).toBe(0);
    });

    it('should calculate bonus for owning Australia', () => {
      const player = createTestPlayer();
      const australia = CONTINENTS.find((c) => c.name === 'australia')!;
      const territories = createContinentTerritories('game-id', australia.territories, player.id);

      const bonus = calculateContinentBonuses(player.id, territories);

      expect(bonus).toBe(2); // Australia bonus
    });

    it('should calculate bonus for owning Asia', () => {
      const player = createTestPlayer();
      const asia = CONTINENTS.find((c) => c.name === 'asia')!;
      const territories = createContinentTerritories('game-id', asia.territories, player.id);

      const bonus = calculateContinentBonuses(player.id, territories);

      expect(bonus).toBe(7); // Asia bonus
    });

    it('should not give bonus if continent is incomplete', () => {
      const player = createTestPlayer();
      const australia = CONTINENTS.find((c) => c.name === 'australia')!;
      const playerTerritories = createContinentTerritories(
        'game-id',
        australia.territories,
        player.id
      );

      // Make one territory owned by someone else
      playerTerritories[0].owner_id = 'other-player-id';

      // Pass only player-owned territories to the function (after mutation)
      const actualPlayerTerritories = playerTerritories.filter((t) => t.owner_id === player.id);

      const bonus = calculateContinentBonuses(player.id, actualPlayerTerritories);

      expect(bonus).toBe(0);
    });
  });

  describe('ownsContinent', () => {
    it('should return true if player owns all territories in continent', () => {
      const player = createTestPlayer();
      const australia = CONTINENTS.find((c) => c.name === 'australia')!;
      const territories = createContinentTerritories('game-id', australia.territories, player.id);

      const owns = ownsContinent(player.id, 'australia', territories);

      expect(owns).toBe(true);
    });

    it('should return false if player is missing territories', () => {
      const player = createTestPlayer();
      const australia = CONTINENTS.find((c) => c.name === 'australia')!;
      const territories = createContinentTerritories('game-id', australia.territories, player.id);

      territories[0].owner_id = 'other-player-id';

      const owns = ownsContinent(player.id, 'australia', territories);

      expect(owns).toBe(false);
    });

    it('should return false for invalid continent', () => {
      const player = createTestPlayer();
      const territories = [createTestTerritory({ owner_id: player.id })];

      const owns = ownsContinent(player.id, 'invalid-continent' as any, territories);

      expect(owns).toBe(false);
    });
  });

  describe('isPlayerEliminated', () => {
    it('should return true if player owns no territories', () => {
      const playerId = 'player-1';
      const territories = [
        createTestTerritory({ owner_id: 'other-player' }),
        createTestTerritory({ owner_id: 'other-player' }),
      ];

      const eliminated = isPlayerEliminated(playerId, territories);

      expect(eliminated).toBe(true);
    });

    it('should return false if player owns at least one territory', () => {
      const playerId = 'player-1';
      const territories = [
        createTestTerritory({ owner_id: playerId }),
        createTestTerritory({ owner_id: 'other-player' }),
      ];

      const eliminated = isPlayerEliminated(playerId, territories);

      expect(eliminated).toBe(false);
    });
  });

  describe('getWinner', () => {
    it('should return null if multiple active players remain', () => {
      const player1 = createTestPlayer({ id: 'player-1', turn_order: 0 });
      const player2 = createTestPlayer({ id: 'player-2', turn_order: 1 });

      const territories = [
        createTestTerritory({ owner_id: player1.id }),
        createTestTerritory({ owner_id: player2.id }),
      ];

      const winner = getWinner([player1, player2], territories);

      expect(winner).toBeNull();
    });

    it('should return winner when only one player remains', () => {
      const player1 = createTestPlayer({ id: 'player-1', turn_order: 0 });
      const player2 = createTestPlayer({ id: 'player-2', turn_order: 1, is_eliminated: true });

      const territories = [
        createTestTerritory({ owner_id: player1.id }),
        createTestTerritory({ owner_id: player1.id }),
      ];

      const winner = getWinner([player1, player2], territories);

      expect(winner).toEqual(player1);
    });

    it('should filter out eliminated players', () => {
      const player1 = createTestPlayer({ id: 'player-1', turn_order: 0 });
      const player2 = createTestPlayer({ id: 'player-2', turn_order: 1, is_eliminated: true });
      const player3 = createTestPlayer({ id: 'player-3', turn_order: 2, is_eliminated: true });

      const territories = [createTestTerritory({ owner_id: player1.id })];

      const winner = getWinner([player1, player2, player3], territories);

      expect(winner).toEqual(player1);
    });
  });

  describe('distributeTerritoriesRandomly', () => {
    it('should distribute all territories among players', () => {
      const players = [createTestPlayer({ turn_order: 0 }), createTestPlayer({ turn_order: 1 })];

      const allTerritoryNames: TerritoryName[] = ['alaska', 'brazil', 'china', 'egypt'];
      const distribution = distributeTerritoriesRandomly(allTerritoryNames, players);

      expect(distribution.size).toBe(4);
      allTerritoryNames.forEach((name) => {
        expect(distribution.has(name)).toBe(true);
      });
    });

    it('should distribute territories evenly among players', () => {
      const players = [
        createTestPlayer({ id: 'p1', turn_order: 0 }),
        createTestPlayer({ id: 'p2', turn_order: 1 }),
      ];

      const allTerritoryNames: TerritoryName[] = ['alaska', 'brazil', 'china', 'egypt'];
      const distribution = distributeTerritoriesRandomly(allTerritoryNames, players);

      const p1Count = Array.from(distribution.values()).filter((id) => id === 'p1').length;
      const p2Count = Array.from(distribution.values()).filter((id) => id === 'p2').length;

      expect(p1Count).toBe(2);
      expect(p2Count).toBe(2);
    });

    it('should handle odd number of territories', () => {
      const players = [createTestPlayer({ turn_order: 0 }), createTestPlayer({ turn_order: 1 })];

      const allTerritoryNames: TerritoryName[] = ['alaska', 'brazil', 'china'];
      const distribution = distributeTerritoriesRandomly(allTerritoryNames, players);

      expect(distribution.size).toBe(3);
    });
  });

  describe('calculateInitialArmies', () => {
    it('should return 40 armies for 2 players', () => {
      expect(calculateInitialArmies(2)).toBe(40);
    });

    it('should return 35 armies for 3 players', () => {
      expect(calculateInitialArmies(3)).toBe(35);
    });

    it('should return 30 armies for 4 players', () => {
      expect(calculateInitialArmies(4)).toBe(30);
    });

    it('should return 25 armies for 5 players', () => {
      expect(calculateInitialArmies(5)).toBe(25);
    });

    it('should return 20 armies for 6 players', () => {
      expect(calculateInitialArmies(6)).toBe(20);
    });

    it('should return default 30 for invalid player count', () => {
      expect(calculateInitialArmies(0)).toBe(30);
      expect(calculateInitialArmies(10)).toBe(30);
    });
  });
});
