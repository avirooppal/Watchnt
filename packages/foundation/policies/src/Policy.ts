
export interface PolicyContext {
    user: any;
    environment: any;
}

export interface Policy {
    name: string;
    evaluate(context: PolicyContext): boolean | never;
}

export class OfflineOnlyPolicy implements Policy {
    name = 'OfflineOnly';
    evaluate(context: PolicyContext): boolean {
        return true; 
    }
}
