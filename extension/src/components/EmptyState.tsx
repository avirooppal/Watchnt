// extension/src/components/EmptyState.tsx


interface EmptyStateProps {
    title: string;
    description: string;
    steps?: string[];
}

export const EmptyState = ({ title, description, steps }: EmptyStateProps) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 mt-20">
            <svg className="w-16 h-16 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h2 className="text-xl font-medium text-white mb-2">{title}</h2>
            <p className="text-sm mb-6 max-w-md">{description}</p>
            {steps && steps.length > 0 && (
                <div className="text-left bg-gray-800 p-4 rounded-lg">
                    <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-300">
                        {steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
