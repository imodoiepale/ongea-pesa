"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const spendingData = [
  { name: 'Food', value: 4500 },
  { name: 'Transport', value: 3000 },
  { name: 'Shopping', value: 6000 },
  { name: 'Bills', value: 8000 },
  { name: 'Entertainment', value: 2500 },
];

const income = 25000;
const expenses = 24000;

export default function AnalyticsDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">KSh {income.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">KSh {expenses.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={spendingData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
