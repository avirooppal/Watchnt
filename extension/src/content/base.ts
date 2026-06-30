export interface PlatformHandler {
  isMeetingActive(): boolean;
  getMeetingTitle(): string;
  getPlatformName(): string;
}
