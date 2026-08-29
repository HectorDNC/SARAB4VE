interface LabelProps {
    name: string;
    htmlFor?: string;
    required?: boolean;
}

export default function Label({ name, htmlFor, required = false }: LabelProps) {
    return (
        <label htmlFor={htmlFor} className="text-on-surface-variant text-sm font-medium">
            {name}
            {required && (
                <span className="text-error" aria-hidden="true"> *</span>
            )}
        </label >
    )
}