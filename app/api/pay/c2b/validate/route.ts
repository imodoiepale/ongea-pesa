import { NextResponse } from 'next/server';

// Daraja C2B Validation URL. We accept every payment; Confirmation does the recording.
export async function POST() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
