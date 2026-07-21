interface LabelProps {
    name: string;
    htmlFor?: string;
}

export default function Label({ name, htmlFor }: LabelProps) {
    return (
        <label htmlFor={htmlFor} className="text-on-surface-variant text-sm font-medium">
            {name}
        </label >
    )
}