import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Truck, Store } from 'lucide-react';
import { FulfillmentType } from '../../lib/types';

interface FulfillmentTabsProps {
  value: FulfillmentType;
  onChange: (value: FulfillmentType) => void;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
}

export const FulfillmentTabs = ({
  value,
  onChange,
  pickupEnabled = true,
  deliveryEnabled = true,
}: FulfillmentTabsProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as FulfillmentType)}>
      <TabsList className="grid w-full grid-cols-2 rounded-xl h-12">
        <TabsTrigger
          value="pickup"
          disabled={!pickupEnabled}
          className="flex items-center gap-2 rounded-xl"
        >
          <Store className="w-4 h-4" />
          Pickup
        </TabsTrigger>
        <TabsTrigger
          value="delivery"
          disabled={!deliveryEnabled}
          className="flex items-center gap-2 rounded-xl"
        >
          <Truck className="w-4 h-4" />
          Delivery
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
