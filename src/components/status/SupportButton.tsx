import { Phone, MessageCircle, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface SupportButtonProps {
  phone: string;
  email?: string;
  orderId: string;
}

export const SupportButton = ({ phone, email = 'info@tabsy.us', orderId }: SupportButtonProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-2xl w-full">
          <MessageCircle className="w-4 h-4 mr-2" />
          Need Help?
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem onClick={() => window.location.href = `tel:${phone}`}>
          <Phone className="w-4 h-4 mr-2" />
          <div>
            <p>Call Us</p>
            <p className="text-xs text-gray-500">{phone}</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.location.href = `mailto:${email}?subject=Order ${orderId}`
          }
        >
          <Mail className="w-4 h-4 mr-2" />
          <div>
            <p>Email Support</p>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
