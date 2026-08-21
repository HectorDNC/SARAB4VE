"use client";

import { useState } from "react";
import {
    getExampleNumber,
    parsePhoneNumberFromString,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import type { Country } from "react-phone-number-input";
import CountrySelect from "@/components/ui/CountrySelect";

interface PhoneFieldProps {
    value: string;
    onChange: (value: string) => void;
}

export default function PhoneField({ onChange }: PhoneFieldProps) {
    const [country, setCountry] = useState<Country>("PE");
    const [rawNumber, setRawNumber] = useState("");

    const exampleNumber = getExampleNumber(country, examples);
    const exampleFormatted = exampleNumber ? exampleNumber.formatNational() : null;
    const expectedLength = exampleNumber ? exampleNumber.nationalNumber.length : null;

    const handleNumberChange = (input: string) => {
        const digitsOnly = input.replace(/\D/g, "");
        setRawNumber(digitsOnly);

        const parsed = parsePhoneNumberFromString(digitsOnly, country);
        onChange(parsed ? parsed.number : "");
    };

    const handleCountryChange = (newCountry: Country) => {
        setCountry(newCountry);
        setRawNumber("");
        onChange("");
    };

    return (
        <div>
            <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-background px-4">
                <CountrySelect value={country} onChange={handleCountryChange} />
                <div
                    className="self-stretch w-px bg-outline-variant shrink-0"
                    aria-hidden="true"
                />
                <input
                    type="tel"
                    className="flex-1 min-w-0 bg-transparent py-2.5 outline-none"
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