
export interface Command<T = any> {
    id: string;
    type: string;
    payload: T;
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
    handle(command: TCommand): Promise<TResult>;
}

export class CommandDispatcher {
    private handlers = new Map<string, CommandHandler<any, any>>();
    
    register(type: string, handler: CommandHandler<any, any>) {
        this.handlers.set(type, handler);
    }
    
    async dispatch<TResult>(command: Command): Promise<TResult> {
        const handler = this.handlers.get(command.type);
        if (!handler) throw new Error(`No handler registered for command: ${command.type}`);
        return handler.handle(command);
    }
}
