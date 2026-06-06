import type { SessionItem, Settings, Room } from '../types';

export function getHourlyRate(
  room: Room,
  playMode: 'single' | 'multi',
  settings: Settings
): number {
  if (room.isVIP && room.vipPrice) {
    return room.vipPrice;
  }

  if (room.consoleType === 'PS5') {
    return playMode === 'single' ? settings.ps5Single : settings.ps5Multi;
  }

  return playMode === 'single' ? settings.ps4Single : settings.ps4Multi;
}

export function getGamePrice(
  room: Room,
  playMode: 'single' | 'multi',
  settings: Settings
): number {
  if (room.consoleType === 'PS5') {
    return playMode === 'single'
      ? (settings.ps5GameSingle ?? 20)
      : (settings.ps5GameMulti ?? 30);
  }

  return playMode === 'single'
    ? (settings.ps4GameSingle ?? 10)
    : (settings.ps4GameMulti ?? 15);
}

export function calculateTimeCost(elapsedSeconds: number, hourlyRate: number): number {
  const hours = elapsedSeconds / 3600;
  return Math.round(hours * hourlyRate * 100) / 100;
}

export function calculateAddonsCost(items: SessionItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
