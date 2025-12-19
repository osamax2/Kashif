import { NextRequest, NextResponse } from 'next/server';

// Connect to backend via internal Docker network
const BACKEND_URL = 'http://87.106.51.243:8000';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const startTime = Date.now();
  try {
    const pathString = path.join('/');
    // Build URL - NO trailing slash (backend doesn't use them)
    const url = `${BACKEND_URL}/api/${pathString}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${url}?${searchParams}` : url;

    // Log to stderr to ensure it shows in docker logs
    process.stderr.write(`[PROXY] ${request.method} ${fullUrl}\n`);

    // Get request body if present
    let body;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        body = await request.json();
        process.stderr.write(`[PROXY] Body: ${JSON.stringify(body).substring(0, 100)}\n`);
      } catch (e) {
        process.stderr.write(`[PROXY] Failed to parse JSON body: ${e}\n`);
      }
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      body = await request.text();
      process.stderr.write(`[PROXY] Form body: ${body.substring(0, 100)}\n`);
    }

    // Forward headers
    const headers: Record<string, string> = {
      'Content-Type': contentType || 'application/json',
    };

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Make backend request with timeout
    process.stderr.write(`[PROXY] Sending request to backend...\n`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      process.stderr.write(`[PROXY] Request timeout after 30s\n`);
    }, 30000);

    const response = await fetch(fullUrl, {
      method: request.method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseData = await response.text();
    const duration = Date.now() - startTime;
    
    process.stderr.write(`[PROXY] Response: ${response.status} (${duration}ms) - ${responseData.substring(0, 200)}\n`);

    // Return response
    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    process.stderr.write(`[PROXY ERROR] After ${duration}ms: ${errorMsg}\n`);
    process.stderr.write(`[PROXY ERROR] Stack: ${error instanceof Error ? error.stack : 'no stack'}\n`);
    
    return NextResponse.json(
      { error: 'Proxy request failed', details: errorMsg },
      { status: 500 }
    );
  }
}
