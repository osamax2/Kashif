import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://38.127.216.236:8000';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.text();
    const fullUrl = `${BACKEND_URL}/api/reports/${params.id}/status`;
    
    const token = request.headers.get('authorization');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = token;
    }

    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers,
      body,
    });

    const responseData = await response.text();
    
    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update report status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
