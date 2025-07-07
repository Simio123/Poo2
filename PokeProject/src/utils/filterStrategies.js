
// src/utils/filterStrategies.js

export const filterStrategies = {
    byType: (pokemonList, type) => {
        if (!type || type === ".") return pokemonList;
        return pokemonList.filter(p => p.types.some(t => t.name.toLowerCase() === type.toLowerCase()));
    },
    byHeight: (pokemonList, heightCategory) => {
        if (!heightCategory || heightCategory === ".") return pokemonList;
        switch (heightCategory) {
            case 'small': return pokemonList.filter(p => p.height !== null && p.height < 1);
            case 'medium': return pokemonList.filter(p => p.height !== null && p.height >= 1 && p.height <= 2);
            case 'large': return pokemonList.filter(p => p.height !== null && p.height > 2);
            default: return pokemonList;
        }
    },
    byWeight: (pokemonList, weightCategory) => {
        if (!weightCategory || weightCategory === ".") return pokemonList;
        switch (weightCategory) {
            case 'light': return pokemonList.filter(p => p.weight !== null && p.weight < 10);
            case 'medium': return pokemonList.filter(p => p.weight !== null && p.weight >= 10 && p.weight <= 50);
            case 'heavy': return pokemonList.filter(p => p.weight !== null && p.weight > 50);
            default: return pokemonList;
        }
    },
    // Add more filter strategies here as needed
};

export function applyFilters(pokemonList, filters) {
    let filtered = [...pokemonList];
    const { sType, sHeight, sWeight } = filters;

    filtered = filterStrategies.byType(filtered, sType);
    filtered = filterStrategies.byHeight(filtered, sHeight);
    filtered = filterStrategies.byWeight(filtered, sWeight);

    // Weakness filter is not fully implemented in original, so keep the warning
    if (filters.sWeakness && filters.sWeakness !== ".") {
        console.warn("Filtro de fraqueza (sWeakness) não implementado completamente.");
    }

    return filtered;
}


