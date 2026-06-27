import { useEffect } from 'react';

export function useKeyboardShortcuts(onToggleRecording) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+Shift+K or Cmd+Shift+K
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (onToggleRecording) {
                    onToggleRecording();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToggleRecording]);
}
