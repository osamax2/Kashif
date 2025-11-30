import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://38.127.216.236:8000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    
    const response = await fetch(`${BACKEND_URL}/api/coupons/categories`, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GET /api/coupons/categories error:', error);
    return NextResponse.json(
      { detail: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.text();
    
    console.log('POST /api/coupons/categories - Body:', body);
    
    const response = await fetch(`${BACKEND_URL}/api/coupons/categories`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: body,
    });

    console.log('Backend response status:', response.status);
    const responseText = await response.text();
    console.log('Backend response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { detail: responseText };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('POST /api/coupons/categories error:', error);
    return NextResponse.json(
      { detail: 'Failed to create category' },
      { status: 500 }
    );
  }
}
