"use client"

import { PlusCircle, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const paymentMethods = [
  {
    type: 'M-Pesa',
    details: '0712 345 678',
    icon: <Smartphone className="h-6 w-6 text-green-500" />,
  },
  {
    type: 'Visa Card',
    details: '**** **** **** 1234',
    icon: <CreditCard className="h-6 w-6 text-blue-500" />,
  },
  {
    type: 'Bank Account',
    details: 'Equity Bank - **** 5678',
    icon: <Banknote className="h-6 w-6 text-purple-500" />,
  },
];

export default function PaymentMethods() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Methods</CardTitle>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center space-x-4">
                  {method.icon}
                  <div>
                    <p className="font-semibold">{method.type}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{method.details}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
