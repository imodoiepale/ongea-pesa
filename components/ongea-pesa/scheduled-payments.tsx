"use client"

import { PlusCircle, Calendar, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const scheduledPayments = [
  {
    recipient: 'KPLC Postpaid',
    amount: 'KSh 2,500',
    nextRun: '1st November 2023',
    frequency: 'Monthly',
  },
  {
    recipient: 'Zuku Internet',
    amount: 'KSh 4,500',
    nextRun: '5th November 2023',
    frequency: 'Monthly',
  },
  {
    recipient: 'Jane Doe (Rent)',
    amount: 'KSh 15,000',
    nextRun: '10th November 2023',
    frequency: 'Monthly',
  },
];

export default function ScheduledPayments() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Scheduled Payments</CardTitle>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{payment.recipient}</p>
                  <p className="text-lg font-bold">{payment.amount}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>Next run: {payment.nextRun}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Repeat className="h-3 w-3" />
                    <span>{payment.frequency}</span>
                  </Badge>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
