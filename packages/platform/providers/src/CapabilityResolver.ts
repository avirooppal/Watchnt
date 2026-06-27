
export class CapabilityResolver {
    supports(provider: any, capability: string): boolean {
        return !!provider?.capabilities?.[capability];
    }
}
