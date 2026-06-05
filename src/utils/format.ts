export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ج.م`;
}

export function formatNumber(amount: number): string {
  return amount.toLocaleString('ar-EG');
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatHours(hours: number): string {
  return hours.toFixed(1);
}

export function formatRoomNumber(num: number): string {
  return String(num).padStart(2, '0');
}

export function formatStartDate(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return isToday ? `اليوم، ${time}` : `${date.toLocaleDateString('ar-EG')}، ${time}`;
}

export function formatLastUpdate(date: Date): string {
  return date.toLocaleTimeString('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
