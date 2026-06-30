import type { PlatformHandler } from './base';

export class GoogleMeetHandler implements PlatformHandler {
  isMeetingActive(): boolean {
    const urlMatches = window.location.pathname.match(/\/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}/);
    const hasLeaveButton = !!document.querySelector('[aria-label="Leave call"]') || !!document.querySelector('[aria-label="Leave meeting"]');
    return !!urlMatches || hasLeaveButton;
  }

  getMeetingTitle(): string {
    const titleElement = document.querySelector('[data-meeting-title]');
    return titleElement ? titleElement.getAttribute('data-meeting-title') || 'Google Meet' : 'Google Meet';
  }

  getPlatformName(): string {
    return 'Google Meet';
  }
}
