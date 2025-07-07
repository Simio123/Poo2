
'use server';

import { cache } from 'react';
import { pokemonAPI } from '../../src/data/pokemon-api-adapter';
import { getSortStrategy } from '../../src/utils/sortStrategies';
import { applyFilters } from '../../src/utils/filterStrategies';
import { getFilterKeyForCategory } from '../../src/utils/categoryFilterKeys';
import { pokemonEventEmitter } from '../../src/events/pokemon-event-emitter';

// Busca Pokémon (Home e busca geral)
export const fetchGames = cache(async (filters = {}, pokemonApiInstance = pokemonAPI) => {
  const { sName = '.', sPage = 1, sOrdering = '.', ...otherFilters } = filters;
  const limit = 40;
  const offset = (sPage - 1) * limit;

  try {
    console.log(`[fetchGames] Filters:`, filters);
    console.log(`[fetchGames] sName: ${sName}, sPage: ${sPage}, sOrdering: ${sOrdering}`);
    if (sName && sName !== "." && /^[0-9]+$/.test(sName)) {
      console.log(`[fetchGames] Searching by ID: ${sName}`);
      const detail = await pokemonApiInstance.getPokemonDetails(sName);
      console.log(`[fetchGames] Result for ID ${sName}:`, detail);
      if (detail) pokemonEventEmitter.emit("pokemonFetched", [detail]);
      return detail ? { pokemon: [detail], hasMore: false } : { pokemon: [], hasMore: false };
    } else if (sName && sName !== ".") {
        console.log(`[fetchGames] Searching by name: ${sName}`);
        const initialList = await pokemonApiInstance.getPokemonList(1302, 0); // Fetch all for name search
        console.log(`[fetchGames] Initial list size: ${initialList.results.length}`);
        const nameMatches = initialList.results.filter(p => p.name.toLowerCase().includes(sName.toLowerCase()));
        console.log(`[fetchGames] Name matches found: ${nameMatches.length}`);
        if (nameMatches.length === 0) return { pokemon: [], hasMore: false };

        const totalFiltered = nameMatches.length;
        const paginatedMatches = nameMatches.slice(offset, offset + limit);
        const hasMore = totalFiltered > (offset + limit);
        console.log(`[fetchGames] Paginated matches: ${paginatedMatches.length}, Has more: ${hasMore}`);

        const pokemonDetailsPromises = paginatedMatches.map(p => pokemonApiInstance.getPokemonDetails(p.url));
        let pokemonDetails = (await Promise.all(pokemonDetailsPromises)).filter(p => p !== null);
        console.log(`[fetchGames] Details fetched for paginated matches: ${pokemonDetails.length}`);
        pokemonDetails = applyFilters(pokemonDetails, otherFilters);
        console.log(`[fetchGames] After applying other filters: ${pokemonDetails.length}`);
        const sortFunction = getSortStrategy(sOrdering);
        const sortedPokemon = [...pokemonDetails].sort(sortFunction);
        console.log(`[fetchGames] Sorted Pokemon count: ${sortedPokemon.length}`);
        pokemonEventEmitter.emit("pokemonFetched", sortedPokemon);
        return { pokemon: sortedPokemon, hasMore };
    } else {
      console.log(`[fetchGames] Fetching all with limit: ${limit}, offset: ${offset}`);
      const data = await pokemonApiInstance.getPokemonList(limit, offset);
      console.log(`[fetchGames] Data from getPokemonList:`, data);
      const hasMore = !!data.next;

      const pokemonDetailsPromises = data.results.map(p => pokemonApiInstance.getPokemonDetails(p.url));
      let pokemonDetails = (await Promise.all(pokemonDetailsPromises)).filter(p => p !== null);
      console.log(`[fetchGames] Details fetched for all: ${pokemonDetails.length}`);
      pokemonDetails = applyFilters(pokemonDetails, otherFilters);
      console.log(`[fetchGames] After applying other filters: ${pokemonDetails.length}`);
      const sortFunction = getSortStrategy(sOrdering);
      const sortedPokemon = [...pokemonDetails].sort(sortFunction);
      console.log(`[fetchGames] Sorted Pokemon count: ${sortedPokemon.length}`);
      pokemonEventEmitter.emit("pokemonFetched", sortedPokemon);
      return { pokemon: sortedPokemon, hasMore };
    }
  } catch (error) {
    console.error('Erro em fetchGames:', error);
    return { pokemon: [], hasMore: false };
  }
});

// Busca Pokémon por CATEGORIA (Tipos, Gerações, Habilidades, etc.)
export const fetchPokemonByCategory = cache(async (categoryType, categoryValue, filters = {}, pokemonApiInstance = pokemonAPI) => {
    const { sName = '.', sOrdering = '.', sPage = 1, ...otherFilters } = filters;
    const limit = 40;
    const offset = (sPage - 1) * limit;

    try {
        let pokemonRefs = [];

        if (categoryType === 'region') {
            const regionData = await pokemonApiInstance.getCategoryData(categoryType, categoryValue);
            if (!regionData) return { pokemon: [], hasMore: false };
            if (!regionData.main_generation?.url) return { pokemon: [], hasMore: false };
            const generationData = await pokemonApiInstance.fetch(regionData.main_generation.url);
            if (generationData.pokemon_species?.length > 0) {
                pokemonRefs = generationData.pokemon_species.filter(p => p?.url && p?.name);
            }
        } else {
            const categoryData = await pokemonApiInstance.getCategoryData(categoryType, categoryValue);
            if (!categoryData) return { pokemon: [], hasMore: false };
            if (categoryData.pokemon?.length > 0) {
                pokemonRefs = categoryData.pokemon.map(p => p.pokemon).filter(p => p?.url && p?.name);
            } else if (categoryData.pokemon_species?.length > 0) {
                pokemonRefs = categoryData.pokemon_species.filter(p => p?.url && p?.name);
            }
        }

        console.log(`[fetchPokemonByCategory - ${categoryType}=${categoryValue}] Found ${pokemonRefs.length} initial refs.`);
        if (pokemonRefs.length === 0) return { pokemon: [], hasMore: false };

        let filteredRefs = pokemonRefs;
        if (sName && sName !== '.') {
            filteredRefs = pokemonRefs.filter(ref => ref.name.toLowerCase().includes(sName.toLowerCase()));
        }

        const totalFiltered = filteredRefs.length;
        const paginatedRefs = filteredRefs.slice(offset, offset + limit);
        const hasMore = totalFiltered > (offset + limit);

        if (paginatedRefs.length === 0) return { pokemon: [], hasMore: false };

        const detailPromises = paginatedRefs.map(ref => {
            let detailUrl = ref.url;
            if (detailUrl.includes('/pokemon-species/')) {
                const speciesId = detailUrl.split('/').filter(Boolean).pop();
                detailUrl = `https://pokeapi.co/api/v2/pokemon/${speciesId}`;
            }
            return pokemonApiInstance.getPokemonDetails(detailUrl);
        });

        let pokemonDetails = (await Promise.all(detailPromises)).filter(p => p !== null);

        const filterKeyToRemove = getFilterKeyForCategory(categoryType);
        const { [filterKeyToRemove]: _, ...remainingFilters } = otherFilters;

        pokemonDetails = applyFilters(pokemonDetails, remainingFilters);
        const sortFunction = getSortStrategy(sOrdering);
        const sortedPokemon = [...pokemonDetails].sort(sortFunction);

        return { pokemon: sortedPokemon, hasMore };

    } catch (error) {
        console.error(`Erro em fetchPokemonByCategory (${categoryType}=${categoryValue}):`, error);
        return { pokemon: [], hasMore: false };
    }
});

// Busca TODAS as habilidades COM DETALHES (Nome e Descrição)
export const fetchAllAbilitiesWithDetails = cache(async (pokemonApiInstance = pokemonAPI) => {
    try {
        const listData = await pokemonApiInstance.getAllAbilities();
        const abilityRefs = listData.results || [];

        if (abilityRefs.length === 0) return [];

        const detailPromises = abilityRefs.map(ref => pokemonApiInstance.getAbilityDetails(ref.url));
        const detailedAbilities = (await Promise.all(detailPromises)).filter(a => a !== null);

        detailedAbilities.sort((a, b) => a.localizedName.localeCompare(b.localizedName));

        return detailedAbilities;

    } catch (error) {
        console.error("Erro em fetchAllAbilitiesWithDetails:", error);
        return [];
    }
});


// Busca detalhes de um Pokémon específico (incluindo descrição, evolução, etc.)
export const fetchGameDetails = cache(async (id, pokemonApiInstance = pokemonAPI) => {
    try {
      if (!id) throw new Error("ID do Pokémon não fornecido");

      console.log(`[fetchGameDetails] Buscando detalhes para ID: ${id}`);
      const pokemon = await pokemonApiInstance.getPokemonDetails(String(id));
      console.log(`[fetchGameDetails] Resultado de getPokemonDetails para ID ${id}:`, pokemon);
      if (!pokemon) throw new Error(`Pokémon com ID ${id} não encontrado ou falha ao buscar`);

      let speciesData = null;
      if (pokemon.species_url) {
          try {
              speciesData = await pokemonApiInstance.fetch(pokemon.species_url);
          } catch (speciesError) { 
              console.warn(`Erro ao buscar species data (detalhes):`, speciesError); 
          }
      }

      let evolutionChainData = [];
      if (speciesData?.evolution_chain?.url) {
          try {
              const evolutionResp = await pokemonAPI.fetch(speciesData.evolution_chain.url);
              if (evolutionResp.chain) {
                  evolutionChainData = await processEvolutionChain(evolutionResp.chain, pokemonApiInstance);
              }
          } catch (evolutionError) {
              console.warn(`Erro ao buscar cadeia de evolução:`, evolutionError);
          }
      }

      let flavorTexts = [];
      if (speciesData?.flavor_text_entries) {
          flavorTexts = speciesData.flavor_text_entries
              .filter(entry => entry.language.name === 'en')
              .map(entry => entry.flavor_text);
      }

      return { ...pokemon, description: flavorTexts[0] || "Descrição não disponível.", evolution_chain: evolutionChainData };

    } catch (error) {
      console.error(`Erro em fetchGameDetails para ID ${id}:`, error);
      return null;
    }
});

// Processa a cadeia de evolução recursivamente
async function processEvolutionChain(chain, pokemonApiInstance) {
    const pokemonList = [];

    async function extractPokemon(currentChain) {
        const speciesName = currentChain.species.name;
        const speciesUrl = currentChain.species.url;
        const speciesId = speciesUrl.split("/").filter(Boolean).pop();
        const pokemonDetail = await pokemonApiInstance.getPokemonDetails(speciesId);
        if (pokemonDetail) {
            pokemonList.push({
                id: pokemonDetail.id,
                name: pokemonDetail.name,
                image: pokemonDetail.sprites.official_artwork || pokemonDetail.sprites.front_default,
            });
        }

        for (const nextEvolution of currentChain.evolves_to) {
            await extractPokemon(nextEvolution);
        }
    }

    await extractPokemon(chain);
    return pokemonList;
}


