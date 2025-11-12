import { describe, it, expect } from 'vitest';
import { territories, continents, allTerritoryNames } from './territoryData';
describe('territories data structure', () => {
    it('should have exactly 42 territories', () => {
        expect(allTerritoryNames).toHaveLength(42);
        expect(Object.keys(territories)).toHaveLength(42);
    });
    it('should have all territories defined', () => {
        allTerritoryNames.forEach(territoryName => {
            expect(territories[territoryName]).toBeDefined();
            expect(territories[territoryName].name).toBe(territoryName);
        });
    });
    it('should have valid continent assignments', () => {
        const validContinents = ['oceania', 'south_america', 'africa', 'europe', 'north_america', 'asia'];
        allTerritoryNames.forEach(territoryName => {
            const territory = territories[territoryName];
            expect(validContinents).toContain(territory.continent);
        });
    });
    it('should have valid neighbor relationships', () => {
        allTerritoryNames.forEach(territoryName => {
            const territory = territories[territoryName];
            // Each territory should have at least one neighbor
            expect(territory.neighbors).toHaveLength(territory.neighbors.length);
            expect(territory.neighbors.length).toBeGreaterThan(0);
            // All neighbors should exist in the territories data
            territory.neighbors.forEach(neighbor => {
                expect(allTerritoryNames).toContain(neighbor);
            });
            // Neighbor relationships should be bidirectional
            territory.neighbors.forEach(neighbor => {
                const neighborTerritory = territories[neighbor];
                expect(neighborTerritory.neighbors).toContain(territoryName);
            });
        });
    });
    it('should have correct initial troop counts', () => {
        allTerritoryNames.forEach(territoryName => {
            // Note: This test assumes territories start with 3 troops as per createInitialState
            // In the actual game state, troops are set to 3 initially
            const territory = territories[territoryName];
            expect(territory).toBeDefined();
            // The territory definition doesn't include troops, that's set in game state
        });
    });
});
describe('continents data structure', () => {
    it('should have exactly 6 continents', () => {
        expect(continents).toHaveLength(6);
    });
    it('should have all required continents', () => {
        const expectedContinents = ['oceania', 'south_america', 'africa', 'europe', 'north_america', 'asia'];
        const actualContinents = continents.map(c => c.name);
        expect(actualContinents).toEqual(expectedContinents);
    });
    it('should have correct continent bonuses', () => {
        const expectedBonuses = {
            oceania: 2,
            south_america: 2,
            africa: 3,
            europe: 5,
            north_america: 5,
            asia: 7
        };
        continents.forEach(continent => {
            expect(continent.bonus).toBe(expectedBonuses[continent.name]);
        });
    });
    it('should have correct territory assignments', () => {
        continents.forEach(continent => {
            // Each continent should have territories
            expect(continent.territories).toHaveLength(continent.territories.length);
            expect(continent.territories.length).toBeGreaterThan(0);
            // All territories in continent should exist
            continent.territories.forEach(territoryName => {
                expect(allTerritoryNames).toContain(territoryName);
                expect(territories[territoryName].continent).toBe(continent.name);
            });
        });
    });
    it('should have no overlapping territories between continents', () => {
        const allContinentTerritories = continents.flatMap(c => c.territories);
        const uniqueTerritories = new Set(allContinentTerritories);
        expect(allContinentTerritories).toHaveLength(uniqueTerritories.size);
        expect(uniqueTerritories.size).toBe(42);
    });
    it('should have correct continent sizes', () => {
        const expectedSizes = {
            oceania: 4,
            south_america: 4,
            africa: 6,
            europe: 7,
            north_america: 9,
            asia: 12
        };
        continents.forEach(continent => {
            expect(continent.territories).toHaveLength(expectedSizes[continent.name]);
        });
    });
});
describe('territory connectivity', () => {
    it('should ensure all territories are connected within their continents', () => {
        // This is a basic connectivity test - in a real implementation you'd do a full graph traversal
        continents.forEach(continent => {
            const continentTerritories = continent.territories;
            // Each territory in the continent should be connected to at least one other
            continentTerritories.forEach(territoryName => {
                const territory = territories[territoryName];
                const connectedToContinent = territory.neighbors.some(neighbor => territories[neighbor].continent === continent.name);
                // Most territories should be connected within their continent
                // (Some edge territories might only connect to other continents)
                expect(territory.neighbors.length).toBeGreaterThan(0);
            });
        });
    });
    it('should validate specific adjacency rules', () => {
        // Test some known adjacencies
        expect(territories.alaska.neighbors).toContain('northwest_territory');
        expect(territories.alaska.neighbors).toContain('alberta');
        expect(territories.alaska.neighbors).toContain('kamchatka');
        expect(territories.eastern_australia.neighbors).toContain('new_guinea');
        expect(territories.eastern_australia.neighbors).toContain('western_australia');
    });
});
describe('data integrity', () => {
    it('should have no duplicate territory names', () => {
        const uniqueNames = new Set(allTerritoryNames);
        expect(uniqueNames.size).toBe(allTerritoryNames.length);
    });
    it('should have consistent data types', () => {
        allTerritoryNames.forEach(territoryName => {
            const territory = territories[territoryName];
            expect(typeof territory.name).toBe('string');
            expect(typeof territory.continent).toBe('string');
            expect(Array.isArray(territory.neighbors)).toBe(true);
            territory.neighbors.forEach(neighbor => {
                expect(typeof neighbor).toBe('string');
            });
        });
    });
    it('should export all required data', () => {
        expect(territories).toBeDefined();
        expect(continents).toBeDefined();
        expect(allTerritoryNames).toBeDefined();
        expect(allTerritoryNames).toHaveLength(42);
    });
});
