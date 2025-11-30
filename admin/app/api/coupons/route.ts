import { NextRequest } from 'next/server';
import { GET as ProxyGET, POST as ProxyPOST, PUT as ProxyPUT, DELETE as ProxyDELETE } from '../[...path]/route';

// Re-export all methods from the proxy with 'coupons' as the path
export async function GET(request: NextRequest) {
  return ProxyGET(request, { params: Promise.resolve({ path: ['coupons'] }) });
}

export async function POST(request: NextRequest) {
  return ProxyPOST(request, { params: Promise.resolve({ path: ['coupons'] }) });
}

export async function PUT(request: NextRequest) {
  return ProxyPUT(request, { params: Promise.resolve({ path: ['coupons'] }) });
}

export async function DELETE(request: NextRequest) {
  return ProxyDELETE(request, { params: Promise.resolve({ path: ['coupons'] }) });
}
