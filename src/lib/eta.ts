import { FulfillmentType, WhenType, TenantSettings } from './types';

const DEFAULT_PREP_SLA_MINUTES = 25;
const DEFAULT_COURIER_LEAD_MINUTES = 15;

export interface ETACalculation {
  prep_time: number;
  courier_lead: number;
  total_minutes: number;
  promised_time: Date;
  display: string;
}

export function calculateETA(
  fulfillment: FulfillmentType,
  when: WhenType,
  scheduledAt?: Date,
  settings?: TenantSettings
): ETACalculation {
  const now = new Date();
  
  // Get SLA from settings or use defaults
  const prepTime = DEFAULT_PREP_SLA_MINUTES;
  const courierLead = settings?.integrations.delivery.pickup_lead_min || DEFAULT_COURIER_LEAD_MINUTES;

  let totalMinutes: number;
  let promisedTime: Date;

  if (when === 'scheduled' && scheduledAt) {
    // Scheduled order
    promisedTime = scheduledAt;
    totalMinutes = Math.floor((promisedTime.getTime() - now.getTime()) / 1000 / 60);
  } else {
    // ASAP order
    if (fulfillment === 'delivery') {
      // For delivery, total time = prep + courier lead
      totalMinutes = prepTime + courierLead;
    } else {
      // For pickup, just prep time
      totalMinutes = prepTime;
    }
    
    promisedTime = new Date(now.getTime() + totalMinutes * 60 * 1000);
  }

  return {
    prep_time: prepTime,
    courier_lead: courierLead,
    total_minutes: totalMinutes,
    promised_time: promisedTime,
    display: formatETADisplay(totalMinutes, promisedTime),
  };
}

export function formatETADisplay(minutes: number, promisedTime: Date): string {
  if (minutes <= 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${mins} min`;
}

export function generateTimeWindows(
  fulfillment: FulfillmentType,
  date: Date = new Date()
): { value: string; label: string; available: boolean }[] {
  const windows = [];
  const now = new Date();
  
  // ASAP option
  const eta = calculateETA(fulfillment, 'asap');
  windows.push({
    value: 'asap',
    label: `ASAP (${eta.display})`,
    available: true,
  });

  // Generate 15-minute intervals for next 4 hours
  const startTime = new Date(now.getTime() + 30 * 60 * 1000); // Start 30 min from now
  
  for (let i = 0; i < 16; i++) {
    const time = new Date(startTime.getTime() + i * 15 * 60 * 1000);
    
    // Skip if outside business hours (simplified - should check actual hours)
    const hour = time.getHours();
    if (hour < 10 || hour > 21) continue;

    windows.push({
      value: time.toISOString(),
      label: time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      available: true,
    });
  }

  return windows;
}

export function isWithinDeliveryHours(settings: TenantSettings): boolean {
  const now = new Date();
  const day = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  
  // This should load from actual hours configuration
  // Simplified for now
  const hour = now.getHours();
  return hour >= 10 && hour <= 21;
}

export function getNextAvailableTime(settings: TenantSettings): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // 10 AM next day
  return tomorrow;
}
