"use client";

import { useState } from "react";
import {
    getCountries,
    getCountryCallingCode,
    getExampleNumber,
    parsePhoneNumberFromString,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import flags from "react-phone-number-input/flags";
import type { Country } from "react-phone-number-input";

interface PhoneFieldProps {
    value: string;
    onChange: (value: string) => void;
}

const ALL_COUNTRIES: Country[] = getCountries().sort();

const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

export default function PhoneField({ value, onChange }: PhoneFieldProps) {
    const [country, setCountry] = useState<Country>("PE");
    const [rawNumber, setRawNumber] = useState("");

    const FlagIcon = flags[country];
    const exampleNumber = getExampleNumber(country, examples);
    const exampleFormatted = exampleNumber ? exampleNumber.formatNational() : null;
    const expectedLength = exampleNumber ? exampleNumber.nationalNumber.length : null;

    const handleNumberChange = (input: string) => {
        const digitsOnly = input.replace(/\D/g, "");
        setRawNumber(digitsOnly);

        const parsed = parsePhoneNumberFromString(digitsOnly, country);
        onChange(parsed ? parsed.number : "");
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCountry = e.target.value as Country;
        setCountry(newCountry);
        setRawNumber("");
        onChange("");
    };

    return (
        <div>
            <div className="flex gap-2 rounded-xl border border-outline-variant bg-background px-4 py-3">
                <div className="flex items-center gap-1 shrink-0">
                    {FlagIcon && (
                        <span className="w-6 h-4 inline-block overflow-hidden rounded-sm shrink-0">
                            <FlagIcon title={country} />
                        </span>
                    )}
                    <select
                        value={country}
                        onChange={handleCountryChange}
                        className="bg-transparent outline-none text-sm cursor-pointer w-18"
                    >
                        {ALL_COUNTRIES.map((c) => (
                            <option key={c} value={c} className="text-black">
                                {c} (+{getCountryCallingCode(c)})
                            </option>
                        ))}
                    </select>
                </div>

                <input
                    type="tel"
                    className="flex-1 bg-transparent outline-none"
                    placeholder={exampleFormatted ?? "Número de teléfono"}
                    value={rawNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                />
            </div>

            {exampleFormatted && (
                <p className="text-xs text-on-surface-variant mt-1">
                    Ejemplo de formato válido: <span className="font-semibold">{exampleFormatted}</span>{" "}
                    ({expectedLength} dígitos, sin contar el código de país)
                </p>
            )}
        </div>
    );
}