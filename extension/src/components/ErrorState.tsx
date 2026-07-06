// extension/src/components/ErrorState.tsx


interface ErrorStateProps {
    what: string;
    why: string;
    fix: string;
    onRetry?: () => void;
}

export const ErrorState = ({ what, why, fix, onRetry }: ErrorStateProps) => {
    return (
        <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-xl my-4 text-left">
            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {what}
            </h3>
            
            <div className="space-y-4 text-sm text-gray-300">
                <div>
                    <span className="font-medium text-gray-200">Why did this happen?</span>
                    <p className="mt-1">{why}</p>
                </div>
                
                <div>
                    <span className="font-medium text-gray-200">How to fix it:</span>
                    <p className="mt-1">{fix}</p>
                </div>
            </div>

            {onRetry && (
                <div className="mt-6">
                    <button 
                        onClick={onRetry}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}
        </div>
    );
};
