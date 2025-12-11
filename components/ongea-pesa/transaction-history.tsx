"use client"

import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Fuel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const transactions = [
  {
    type: 'Received',
    icon: <ArrowDownLeft className="h-6 w-6 text-green-500" />,
    details: 'From John Doe',
    amount: '+ KSh 500.00',
    date: '2023-10-27',
    status: 'Completed',
  },
  {
    type: 'Sent',
    icon: <ArrowUpRight className="h-6 w-6 text-red-500" />,
    details: 'To Jane Smith',
    amount: '- KSh 250.00',
    date: '2023-10-26',
    status: 'Completed',
  },
  {
    type: 'Purchase',
    icon: <ShoppingCart className="h-6 w-6 text-blue-500" />,
    details: 'Naivas Supermarket',
    amount: '- KSh 1,200.00',
    date: '2023-10-25',
    status: 'Completed',
  },
  {
    type: 'Bill Payment',
    icon: <Fuel className="h-6 w-6 text-orange-500" />,
    details: 'Total Petrol Station',
    amount: '- KSh 3,000.00',
    date: '2023-10-24',
    status: 'Pending',
  },
];

export default function TransactionHistory() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {transaction.icon}
                  <div>
                    <p className="font-semibold">{transaction.details}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.amount.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.amount}
                  </p>
                  <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
