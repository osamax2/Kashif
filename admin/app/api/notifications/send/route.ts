import { NextRequest } from 'next/server';
import { POST as ProxyPOST } from '../../[...path]/route';

export async function POST(request: NextRequest) {
  return ProxyPOST(request, { params: Promise.resolve({ path: ['notifications', 'send'] }) });
}
