import { Clock } from 'lucide-react';
import { Badge } from './ui/badge';
import { isOpenNow, getTodayHours } from '../utils/hours';
import { Hours } from '../hooks/useConfig';

interface HoursBadgeProps {
  hours: Hours | null;
  variant?: 'inline' | 'card';
  brandColor?: string;
}

export const HoursBadge = ({ hours, variant = 'inline', brandColor }: HoursBadgeProps) => {
  const open = isOpenNow(hours);
  const todayHours = getTodayHours(hours);

  if (variant === 'card') {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5" />
          <span>Hours Today</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={open ? 'default' : 'secondary'}
            style={open && brandColor ? { backgroundColor: brandColor } : {}}
            className={open ? 'text-white' : ''}
          >
            {open ? 'Open Now' : 'Closed'}
          </Badge>
          <span className="text-sm text-gray-600">{todayHours}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={open ? 'default' : 'secondary'}
        style={open && brandColor ? { backgroundColor: brandColor } : {}}
        className={open ? 'text-white' : ''}
      >
        {open ? 'Open Now' : 'Closed'}
      </Badge>
      <span className="text-sm">{todayHours}</span>
    </div>
  );
};
