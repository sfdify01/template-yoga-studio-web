import { Hours } from '../hooks/useConfig';

export const isOpenNow = (hours: Hours | null): boolean => {
  if (!hours) return false;

  const now = new Date();
  const dayName = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const todayHours = hours.schedule[dayName];
  if (!todayHours || todayHours.closed) return false;

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

export const getTodayHours = (hours: Hours | null): string => {
  if (!hours) return 'Hours not available';

  const now = new Date();
  const dayName = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const todayHours = hours.schedule[dayName];

  if (!todayHours || todayHours.closed) return 'Closed Today';

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${minute} ${period}`;
  };

  return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
};

export const getFormattedPhone = (phone: string): string => {
  return phone.replace(/(\+1\s?)?(\d{3})(\d{3})(\d{4})/, '($2) $3-$4');
};
