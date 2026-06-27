
export interface Transition<S, E> {
    from: S | S[];
    event: E;
    to: S;
    guard?: (context: any) => boolean;
    action?: (context: any) => void;
}

export class StateMachine<S, E> {
    constructor(private currentState: S, private transitions: Transition<S, E>[]) {}
    
    canTransition(event: E, context?: any): boolean {
        return this.transitions.some(t => {
            const matchesFrom = Array.isArray(t.from) ? t.from.includes(this.currentState) : t.from === this.currentState;
            if (!matchesFrom || t.event !== event) return false;
            if (t.guard && !t.guard(context)) return false;
            return true;
        });
    }

    transition(event: E, context?: any): S {
        const t = this.transitions.find(t => {
            const matchesFrom = Array.isArray(t.from) ? t.from.includes(this.currentState) : t.from === this.currentState;
            return matchesFrom && t.event === event && (!t.guard || t.guard(context));
        });
        if (!t) throw new Error(`Cannot transition from ${this.currentState} via ${event}`);
        if (t.action) t.action(context);
        this.currentState = t.to;
        return this.currentState;
    }
    
    getState(): S {
        return this.currentState;
    }
}
