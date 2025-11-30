import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Kashif API Test</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        button {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #1d4ed8;
        }
        pre {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid #e5e7eb;
        }
        .success { color: #059669; font-weight: bold; }
        .error { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Kashif API Connection Test</h1>
        <p>This page tests if the Next.js proxy is working correctly.</p>
        
        <button onclick="testLogin()">Test Login API</button>
        <button onclick="testUsers()">Test Users API</button>
        
        <h2>Result:</h2>
        <pre id="result">Click a button to test...</pre>
    </div>

    <script>
        async function testLogin() {
            const resultEl = document.getElementById('result');
            resultEl.textContent = 'Testing login endpoint...\\n';
            
            try {
                const formData = new URLSearchParams();
                formData.append('username', 'admin@kashif.com');
                formData.append('password', 'Admin@123');
                
                const response = await fetch('/api/auth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.access_token) {
                    resultEl.innerHTML = '<span class="success">✓ SUCCESS!</span>\\n\\n' + 
                        JSON.stringify(data, null, 2) +
                        '\\n\\n<span class="success">API Proxy is working correctly!</span>';
                    
                    // Store token for next test
                    window.testToken = data.access_token;
                } else {
                    resultEl.innerHTML = '<span class="error">✗ FAILED</span>\\n\\n' + 
                        JSON.stringify(data, null, 2);
                }
            } catch (error) {
                resultEl.innerHTML = '<span class="error">✗ ERROR:</span> ' + error.message;
            }
        }
        
        async function testUsers() {
            const resultEl = document.getElementById('result');
            
            if (!window.testToken) {
                resultEl.textContent = 'Please run "Test Login API" first to get a token.';
                return;
            }
            
            resultEl.textContent = 'Testing users endpoint...\\n';
            
            try {
                const response = await fetch('/api/auth/users?skip=0&limit=5', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + window.testToken,
                    },
                });
                
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    resultEl.innerHTML = '<span class="success">✓ SUCCESS!</span>\\n\\n' + 
                        'Found ' + data.length + ' users:\\n\\n' +
                        JSON.stringify(data, null, 2) +
                        '\\n\\n<span class="success">Users API is working correctly!</span>';
                } else {
                    resultEl.innerHTML = '<span class="error">✗ FAILED</span>\\n\\n' + 
                        JSON.stringify(data, null, 2);
                }
            } catch (error) {
                resultEl.innerHTML = '<span class="error">✗ ERROR:</span> ' + error.message;
            }
        }
    </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
