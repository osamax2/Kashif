#!/usr/bin/env python3
"""Check and fix nginx configuration"""

import sys

import paramiko


def main():
    # SSH connection details
    host = "38.127.216.236"
    username = "root"
    password = "Osama1234"
    
    print("🔍 Connecting to server...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(host, username=username, password=password, timeout=30)
        print("✓ Connected to server\n")
        
        # Check nginx container status
        print("📋 Checking nginx/gateway container...")
        stdin, stdout, stderr = ssh.exec_command("docker ps | grep gateway")
        gateway_info = stdout.read().decode()
        print(f"Gateway container:\n{gateway_info}")
        
        # Check nginx configuration location
        print("\n📋 Looking for nginx configuration...")
        stdin, stdout, stderr = ssh.exec_command("""
            find /root/Kashif_backend -name "nginx.conf" -o -name "default.conf" 2>/dev/null
        """)
        nginx_files = stdout.read().decode()
        print(f"Nginx config files:\n{nginx_files}")
        
        # Check the Backend directory structure
        print("\n📋 Checking Backend directory structure...")
        stdin, stdout, stderr = ssh.exec_command("ls -la /root/Kashif_backend/Kashif/Backend/")
        backend_structure = stdout.read().decode()
        print(f"Backend structure:\n{backend_structure}")
        
        # Check if there's a gateway/nginx directory
        print("\n📋 Looking for gateway/nginx directory...")
        stdin, stdout, stderr = ssh.exec_command("""
            find /root/Kashif_backend/Kashif -type d -name "gateway" -o -name "nginx" 2>/dev/null | head -10
        """)
        gateway_dirs = stdout.read().decode()
        print(f"Gateway/nginx directories:\n{gateway_dirs}")
        
        # Check docker-compose.yml for gateway service config
        print("\n📋 Checking docker-compose.yml for gateway service...")
        stdin, stdout, stderr = ssh.exec_command("""
            cat /root/Kashif_backend/Kashif/Backend/docker-compose.yml | grep -A 20 gateway
        """)
        gateway_config = stdout.read().decode()
        print(f"Gateway configuration:\n{gateway_config}")
        
        # Check actual nginx config inside container
        print("\n📋 Checking nginx config inside container...")
        stdin, stdout, stderr = ssh.exec_command("""
            docker exec kashif-gateway cat /etc/nginx/conf.d/default.conf 2>/dev/null || 
            docker exec kashif-gateway cat /etc/nginx/nginx.conf 2>/dev/null
        """)
        nginx_content = stdout.read().decode()
        error = stderr.read().decode()
        
        if nginx_content:
            print(f"Current nginx configuration:\n{nginx_content}")
        else:
            print(f"Could not read nginx config: {error}")
        
        # Try to access auth service directly
        print("\n📋 Testing direct auth service access...")
        stdin, stdout, stderr = ssh.exec_command("""
            docker exec kashif-auth curl -s http://localhost:8000/health 2>/dev/null || echo "Failed"
        """)
        health_check = stdout.read().decode()
        print(f"Auth service health check: {health_check}")
        
        # Check auth service logs
        print("\n📋 Checking auth service logs (last 20 lines)...")
        stdin, stdout, stderr = ssh.exec_command("""
            docker logs kashif-auth --tail 20 2>&1
        """)
        auth_logs = stdout.read().decode()
        print(f"Auth service logs:\n{auth_logs}")
        
        # Check gateway logs
        print("\n📋 Checking gateway logs (last 20 lines)...")
        stdin, stdout, stderr = ssh.exec_command("""
            docker logs kashif-gateway --tail 20 2>&1
        """)
        gateway_logs = stdout.read().decode()
        print(f"Gateway logs:\n{gateway_logs}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        ssh.close()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
if __name__ == "__main__":
    sys.exit(main())
