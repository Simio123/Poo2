// src/bloc/pokemon-bloc.js

import { pokemonEventEmitter } from "../events/pokemon-event-emitter";
import { fetchGames, fetchPokemonByCategory, fetchAllAbilitiesWithDetails, fetchGameDetails } from "../../app/actions/gameActions";
import { pokemonAPI } from "../data/pokemon-api-adapter";

class PokemonBloc {
    constructor(pokemonApiInstance) {
        this.pokemonApi = pokemonApiInstance;
        this.state = {
            pokemonList: [],
            filters: {
                sName: ".",
                sType: ".",
                sWeakness: ".",
                sAbility: ".",
                sHeight: ".",
                sWeight: ".",
                sOrdering: ".",
                sPage: 1
            },
            loading: false,
            isLoadingMore: false,
            hasMore: true,
            error: null,
            abilities: []
        };
        this.listeners = [];
        this.init();
    }

    init() {
        // Load initial abilities
        this.loadAbilities();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state); // Emit current state immediately to new subscriber
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    _emit(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener(this.state));
    }

    async loadAbilities() {
        this._emit({ loading: true });
        try {
            const abilities = await fetchAllAbilitiesWithDetails(this.pokemonApi);
            this._emit({ abilities, loading: false });
        } catch (error) {
            console.error("Error loading abilities:", error);
            this._emit({ error: "Failed to load abilities.", loading: false });
        }
    }

    async fetchPokemon(newFilters = {}) {
        console.log("[PokemonBloc] fetchPokemon called with newFilters:", newFilters);
        this._emit({ loading: true, error: null });
        const currentFilters = { ...this.state.filters, ...newFilters };
        console.log("[PokemonBloc] currentFilters:", currentFilters);

        try {
            let result;
            if (currentFilters.sType !== "." || currentFilters.sWeakness !== ".") {
                console.log("[PokemonBloc] Fetching by category.");
                const categoryType = currentFilters.sType !== "." ? "type" : "type";
                const categoryValue = currentFilters.sType !== "." ? currentFilters.sType : currentFilters.sWeakness;
                result = await fetchPokemonByCategory(categoryType, categoryValue, currentFilters, this.pokemonApi);
                console.log("[PokemonBloc] Result from fetchPokemonByCategory:", result);
            } else {
                console.log("[PokemonBloc] Fetching all games.");
                result = await fetchGames(currentFilters, this.pokemonApi);
                console.log("[PokemonBloc] Result from fetchGames:", result);
            }

            let updatedPokemonList;
            if (currentFilters.sPage === 1) {
                updatedPokemonList = result.pokemon || [];
                console.log("[PokemonBloc] First page fetch. updatedPokemonList:", updatedPokemonList.length);
            } else {
                const newPokemon = (result.pokemon || []).filter(newPoke =>
                    !this.state.pokemonList.some(existingPoke => existingPoke.id === newPoke.id)
                );
                updatedPokemonList = [...this.state.pokemonList, ...newPokemon];
                console.log("[PokemonBloc] Loading more. newPokemon count:", newPokemon.length, "updatedPokemonList total:", updatedPokemonList.length);
            }

            this._emit({
                pokemonList: updatedPokemonList,
                filters: currentFilters,
                hasMore: result.hasMore,
                loading: false,
                isLoadingMore: false
            });
            console.log("[PokemonBloc] State updated. pokemonList count:", updatedPokemonList.length);
            pokemonEventEmitter.emit("pokemonFetched", updatedPokemonList);
        } catch (error) {
            console.error("Error fetching Pokemon:", error);
            this._emit({ error: "Failed to fetch Pokemon.", loading: false });
        }
    }
}

export const pokemonBloc = new PokemonBloc(pokemonAPI);

