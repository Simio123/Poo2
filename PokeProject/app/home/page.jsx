"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGames } from '../actions/gameActions';
import Link from 'next/link';
import PokemonCard from '../components/PokemonCard';
import { pokemonEventEmitter } from '../../src/events/pokemon-event-emitter';
import { pokemonBloc } from '../../src/bloc/pokemon-bloc';

export default function HomePage() {
  const [blocState, setBlocState] = useState(pokemonBloc.state);

  useEffect(() => {
    const unsubscribe = pokemonBloc.subscribe(setBlocState);
    pokemonBloc.fetchPokemon(); // Initial fetch
    return () => unsubscribe();
  }, []);

  const { pokemonList, filters, loading, isLoadingMore, hasMore, error, abilities } = blocState;

  const initialFilters = useRef(pokemonBloc.state.filters); // Use bloc's initial filters
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const searchTimeout = useRef(null);

  const lastPokemonElementRef = useCallback(node => {
    if (loading || isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        pokemonBloc.loadMorePokemon();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, isLoadingMore, hasMore]);

  const pokemonTypes = [
    "normal", "fire", "water", "grass", "electric", "ice", "fighting",
    "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
    "dragon", "dark", "steel", "fairy"
  ];

  // Use abilities from blocState
  const commonAbilities = abilities.map(a => a.name);

  // Atualiza os filtros com debounce para busca por nome
  const updateFilters = (event) => {
    const { name, value } = event.target;
    const filterValue = value === "" ? "." : value;

    if (name === 'sName') {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (filterValue.length > 2 || filterValue === ".") {
          searchTimeout.current = setTimeout(() => {
            pokemonBloc.setFilters({ [name]: filterValue });
          }, 500);
      } else {
          // If 1 or 2 characters, don't search automatically, wait for button
          pokemonBloc.setFilters({ [name]: filterValue }); // Update filter state immediately for UI
      }
    } else {
        pokemonBloc.setFilters({ [name]: filterValue });
    }
  };

  const resetFilters = () => {
    pokemonBloc.resetFilters();
  };

  // Função para aplicar os filtros manualmente (usado pelo botão Buscar)
  const applyFiltersManually = () => {
    pokemonBloc.fetchPokemon(filters);
  };

  // O useEffect para buscar dados agora é gerenciado pelo BLOC
  // O BLOC se encarrega de chamar fetchPokemon() na inicialização e quando os filtros mudam internamente.

  // O Observer para eventos de Pokémon continua aqui se houver outros observadores além do BLOC
  // Se o BLOC for o único a emitir e consumir, este useEffect pode ser removido.
  useEffect(() => {
    const handlePokemonFetched = (fetchedPokemon) => {
      console.log("[Observer] Pokemons fetched:", fetchedPokemon.map(p => p.name));
      // Aqui você pode adicionar lógica para reagir aos dados recém-buscados
      // Por exemplo, atualizar um estado global ou exibir uma notificação
    };

    pokemonEventEmitter.on("pokemonFetched", handlePokemonFetched);

    return () => {
      pokemonEventEmitter.off("pokemonFetched", handlePokemonFetched);
    };
  }, []); // Este useEffect só precisa ser executado uma vez na montagem do componente

  const loadMorePokemon = () => {
    if (!isLoadingMore && hasMore && !loading) {
      setIsLoadingMore(true);
      setFilters(prev => ({ ...prev, sPage: prev.sPage + 1 }));
    }
  };

  const getRandomPokemon = () => {
    const randomId = Math.floor(Math.random() * 1025) + 1;
    pokemonBloc.setFilters({
        ...pokemonBloc.state.filters,
        sName: randomId.toString(),
        sPage: 1
    });
  };

  // ----- Renderização -----

  return (
    <div className="min-h-screen py-9 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">Pokédex</h1>

        {/* Barra de Filtros */}
        <div className="search-bar bg-gray-100 p-4 md:p-6 rounded-lg shadow-md mb-8">
          {/* Filtro por Nome */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-grow relative">
              <label htmlFor="pokemon-search" className="sr-only">Buscar por nome ou número</label>
              <input
                id="pokemon-search"
                type="text"
                name="sName"
                placeholder="Buscar por nome ou número..."
                value={filters.sName === "." ? "" : filters.sName} // Mostra vazio se for "."
                onChange={updateFilters}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pokeRed focus:border-transparent"
              />
              {filters.sName !== "." && (
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, sName: ".", sPage: 1 }));
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label="Limpar busca"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                   </svg>
                </button>
              )}
            </div>
            <button
              onClick={applyFiltersManually} // Chama a função manual
              className="bg-pokeRed text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center sm:w-auto w-full"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
              Buscar
            </button>
          </div>

          {/* Botões Avançados e Aleatório */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center">
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="text-sm text-pokeRed hover:text-red-700 transition-colors flex items-center mb-2 sm:mb-0"
            >
              {showAdvancedSearch ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  Ocultar filtros avançados
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  Mostrar filtros avançados
                </>
              )}
            </button>
            <button
              onClick={getRandomPokemon}
              className="bg-pokeBlue text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Surpreenda-me!
            </button>
          </div>

          {/* Filtros Avançados */}
          {showAdvancedSearch && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-300">
               {/* Filtro Tipo */}
               <div>
                 <label htmlFor="pokemon-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                 <select
                   id="pokemon-type"
                   name="sType"
                   value={filters.sType}
                   onChange={updateFilters}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-pokeRed focus:border-pokeRed"
                 >
                   <option value=".">Todos</option>
                   {pokemonTypes.map(type => (
                     <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                   ))}
                 </select>
               </div>
               {/* Filtro Fraqueza */}
               <div>
                 <label htmlFor="pokemon-weakness" className="block text-sm font-medium text-gray-700 mb-1">Fraqueza</label>
                 <select
                   id="pokemon-weakness"
                   name="sWeakness"
                   value={filters.sWeakness}
                   onChange={updateFilters}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-pokeRed focus:border-pokeRed"
                 >
                   <option value=".">Todas</option>
                   {pokemonTypes.map(type => (
                     <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                   ))}
                 </select>
               </div>
               {/* Filtro Habilidade */}
               <div>
                 <label htmlFor="pokemon-ability" className="block text-sm font-medium text-gray-700 mb-1">Habilidade</label>
                 <select
                   id="pokemon-ability"
                   name="sAbility"
                   value={filters.sAbility}
                   onChange={updateFilters}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-pokeRed focus:border-pokeRed"
                 >
                   <option value=".">Todas</option>
                   {commonAbilities.map(ability => (
                     <option key={ability} value={ability}>
                       {ability.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                     </option>
                   ))}
                 </select>
               </div>
               {/* Filtro Altura */}
               <div>
                 <label htmlFor="pokemon-height" className="block text-sm font-medium text-gray-700 mb-1">Altura</label>
                 <select
                   id="pokemon-height"
                   name="sHeight"
                   value={filters.sHeight}
                   onChange={updateFilters}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-pokeRed focus:border-pokeRed"
                 >
                   <option value=".">Qualquer</option>
                   <option value="small">Pequeno (&lt; 1m)</option>
                   <option value="medium">Médio (1m - 2m)</option>
                   <option value="large">Grande (&gt; 2m)</option>
                 </select>
               </div>
               {/* Filtro Peso */}
               <div>
                 <label htmlFor="pokemon-weight" className="block text-sm font-medium text-gray-700 mb-1">Peso</label>
                 <select
                   id="pokemon-weight"
                   name="sWeight"
                   value={filters.sWeight}
                   onChange={updateFilters}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-pokeRed focus:border-pokeRed"
                 >
                   <option value=".">Qualquer</option>
                   <option value="light">Leve (&lt; 10kg)</option>
                   <option value="medium">Médio (10kg - 50kg)</option>
                   <option value="heavy">Pesado (&gt; 50kg)</option>
                 </select>
               </div>
               {/* Botão Limpar */}
               <div className="lg:col-span-1 flex items-end justify-end">
                  <button
                    onClick={resetFilters}
                    className="w-full md:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Limpar Filtros
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Contagem e Ordenação */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-3 sm:mb-0">
            {!loading && pokemonList.length > 0 && (
              <p className="text-gray-600 text-sm">
                Exibindo {pokemonList.length} {pokemonList.length === 1 ? 'Pokémon' : 'Pokémons'}
              </p>
            )}
             {!loading && pokemonList.length === 0 && filters.sName !== "." && (
                <p className="text-gray-600 text-sm">Nenhum Pokémon encontrado para "{filters.sName}".</p>
             )}
             {!loading && pokemonList.length === 0 && filters.sName === "." && (
                <p className="text-gray-600 text-sm">Nenhum Pokémon encontrado com os filtros aplicados.</p>
             )}
          </div>
          <div className="flex items-center">
            <label htmlFor="pokemon-ordering" className="mr-2 text-gray-700 text-sm">Organizar por:</label>
            <select
              id="pokemon-ordering"
              name="sOrdering"
              value={filters.sOrdering}
              onChange={updateFilters}
              className="p-2 text-sm rounded-lg border border-gray-300 focus:ring-pokeRed focus:border-pokeRed"
            >
              <option value=".">Número (Crescente)</option>
              <option value="name">Nome (A-Z)</option>
              <option value="-name">Nome (Z-A)</option>
              <option value="height">Altura (Menor &gt; Maior)</option>
              <option value="-height">Altura (Maior &gt; Menor)</option>
              <option value="weight">Peso (Leve &gt; Pesado)</option>
              <option value="-weight">Peso (Pesado &gt; Leve)</option>
            </select>
          </div>
        </div>

        {/* Grid de Pokémon */}
        {loading && filters.sPage === 1 ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pokeRed mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando Pokémon...</p>
          </div>
        ) : pokemonList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {pokemonList.map((pokemon, index) => {
              if (pokemonList.length === index + 1) {
                return (
                  <div ref={lastPokemonElementRef} key={pokemon.id}>
                    <PokemonCard pokemon={pokemon} />
                  </div>
                );
              } else {
                return <PokemonCard key={pokemon.id} pokemon={pokemon} />;
              }
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 text-lg">Nenhum Pokémon encontrado.</p>
            <p className="text-gray-400 text-sm mt-2">Tente ajustar seus filtros ou limpar a busca.</p>
          </div>
        )}

        {/* Indicador de Carregando Mais */}
        {isLoadingMore && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pokeBlue mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">Carregando mais Pokémon...</p>
          </div>
        )}

        {/* Mensagem de Fim da Lista */}
        {!hasMore && !loading && pokemonList.length > 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">
            Fim da lista.
          </div>
        )}
      </div>
    </div>
  );
}

