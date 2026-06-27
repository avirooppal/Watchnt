import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Watchn't Extension Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
                    <h2 style={{ color: '#ff4d4f' }}>Something went wrong.</h2>
                    <p style={{ color: '#666' }}>We've encountered an unexpected error.</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        style={{
                            padding: '10px 20px',
                            background: '#1677ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                    {this.state.error && (
                        <pre style={{ marginTop: '20px', textAlign: 'left', background: '#f5f5f5', padding: '10px', fontSize: '12px', overflowX: 'auto' }}>
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
