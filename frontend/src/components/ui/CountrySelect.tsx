"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import flags from "react-phone-number-input/flags";
import type { Country } from "react-phone-number-input";

interface CountrySelectProps {
    value: Country;
    onChange: (country: Country) => void;
}

// Lista completa de países (código ISO) ordenada alfabéticamente.
// Se calcula una sola vez a nivel de módulo para no reconstruirla en cada render.
const ALL_COUNTRIES: Country[] = getCountries().sort();

// Instancia compartida de Intl.DisplayNames para obtener el nombre del país en español.
const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

// Opciones preprocesadas: nombre en español, prefijo telefónico y bandera.
// Al memoizarlas a nivel de módulo evitamos recalcularlas cada vez que se abre el dropdown.
const COUNTRY_OPTIONS = ALL_COUNTRIES.map((country) => {
    const FlagIcon = flags[country];
    return {
        country,
        name: countryNames.of(country) ?? country,
        callingCode: getCountryCallingCode(country),
        FlagIcon,
    };
});

// Bandera de un país. Reutiliza el mismo tamaño y recorte (w-6 h-4 + overflow-hidden)
// que se usaba en el campo cerrado del formulario, para mantener la coherencia visual.
function CountryFlag({
    FlagIcon,
    country,
}: {
    FlagIcon?: React.ComponentType<{ title: string }>;
    country: Country;
}) {
    if (!FlagIcon) return null;
    return (
        <span className="w-6 h-4 inline-block overflow-hidden rounded-sm shrink-0">
            <FlagIcon title={country} />
        </span>
    );
}

export default function CountrySelect({ value, onChange }: CountrySelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Opciones filtradas por el término de búsqueda (nombre, código ISO o prefijo).
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return COUNTRY_OPTIONS;
        return COUNTRY_OPTIONS.filter(
            (option) =>
                option.name.toLowerCase().includes(query) ||
                option.country.toLowerCase().includes(query) ||
                option.callingCode.includes(query)
        );
    }, [search]);

    const selected =
        COUNTRY_OPTIONS.find((option) => option.country === value) ?? COUNTRY_OPTIONS[0];

    // Abre el dropdown reiniciando búsqueda y resaltado.
    function openDropdown() {
        setSearch("");
        setHighlightedIndex(0);
        setOpen(true);
    }

    // Alterna la apertura del dropdown.
    function toggleOpen() {
        if (open) {
            setOpen(false);
        } else {
            openDropdown();
        }
    }

    function selectCountry(country: Country) {
        onChange(country);
        setOpen(false);
    }

    // Al escribir en el buscador, el resaltado vuelve al primer resultado.
    function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSearch(event.target.value);
        setHighlightedIndex(0);
    }

    // Cierra el dropdown al hacer clic fuera.
    useEffect(() => {
        if (!open) return;
        function handlePointerDown(event: PointerEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    // Enfoca el buscador apenas se abre el dropdown (solo manipulación del DOM).
    useEffect(() => {
        if (!open) return;
        requestAnimationFrame(() => searchRef.current?.focus());
    }, [open]);

    // Mantiene visible la opción resaltada dentro del área de scroll.
    useEffect(() => {
        if (!open) return;
        const item = listRef.current?.children[highlightedIndex] as HTMLElement | undefined;
        item?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex, open]);

    function handleKeyDown(event: React.KeyboardEvent) {
        // Teclado cuando el dropdown está cerrado: abre y prepara navegación.
        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                openDropdown();
            }
            return;
        }

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setHighlightedIndex((index) => Math.min(index + 1, filtered.length - 1));
                break;
            case "ArrowUp":
                event.preventDefault();
                setHighlightedIndex((index) => Math.max(index - 1, 0));
                break;
            case "Home":
                event.preventDefault();
                setHighlightedIndex(0);
                break;
            case "End":
                event.preventDefault();
                setHighlightedIndex(filtered.length - 1);
                break;
            case "Enter":
                event.preventDefault();
                if (filtered[highlightedIndex]) {
                    selectCountry(filtered[highlightedIndex].country);
                }
                break;
            case "Escape":
                event.preventDefault();
                setOpen(false);
                break;
        }
    }

    return (
        <div
            ref={containerRef}
            onKeyDown={handleKeyDown}
            className="relative shrink-0"
        >
            {/* Botón que muestra el estado cerrado: bandera + código ISO + prefijo. */}
            <button
                type="button"
                onClick={toggleOpen}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Seleccionar código de país"
                className="flex min-h-[30px] items-center gap-1 cursor-pointer"
            >
                <CountryFlag FlagIcon={selected.FlagIcon} country={selected.country} />
                <span className="text-sm whitespace-nowrap">
                    {selected.country} (+{selected.callingCode})
                </span>
                <svg
                    className={`w-4 h-4 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {/* Lista desplegada con bandera, código ISO y prefijo por cada país. */}
            {open && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 max-w-[85vw] rounded-xl border border-outline-variant bg-background shadow-lg">
                    <div className="p-2 border-b border-outline-variant">
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Buscar país..."
                            aria-label="Buscar país"
                            aria-controls="country-select-listbox"
                            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <ul
                        ref={listRef}
                        id="country-select-listbox"
                        role="listbox"
                        aria-label="Países"
                        className="max-h-56 overflow-y-auto py-1"
                    >
                        {filtered.map((option, index) => {
                            const isSelected = option.country === value;
                            const isHighlighted = index === highlightedIndex;
                            return (
                                <li key={option.country} role="option" aria-selected={isSelected}>
                                    <button
                                        type="button"
                                        onClick={() => selectCountry(option.country)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                                            isHighlighted ? "bg-surface-container-low" : ""
                                        }`}
                                    >
                                        <CountryFlag
                                            FlagIcon={option.FlagIcon}
                                            country={option.country}
                                        />
                                        <span className="text-sm whitespace-nowrap">
                                            {option.country} (+{option.callingCode})
                                        </span>
                                        <span className="text-xs text-on-surface-variant truncate">
                                            {option.name}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}

                        {filtered.length === 0 && (
                            <li className="px-3 py-2 text-sm text-on-surface-variant">
                                Sin resultados
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
