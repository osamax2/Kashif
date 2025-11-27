#!/usr/bin/env python3
"""
Find database credentials and run migration
"""

import paramiko

SERVER_HOST = "38.127.216.236"
SERVER_USER = "root"
SERVER_PASSWORD = "33Dpf178Lty9pzg_x31O35"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting...")
        ssh.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASSWORD, timeout=30)
        print("✓ Connected\n")
        
        # Check .env file
        print("1. Checking environment file...")
        stdin, stdout, stderr = ssh.exec_command(
            "cat /root/Kashif_backend/Kashif/Backend/.env | grep -i postgres",
            timeout=30
        )
        env_content = stdout.read().decode('utf-8')
        print(env_content)
        
        # Check docker-compose for db config
        print("\n2. Checking docker-compose configuration...")
        stdin, stdout, stderr = ssh.exec_command(
            "grep -A 5 'kashif-auth-db:' /root/Kashif_backend/Kashif/Backend/docker-compose.yml",
            timeout=30
        )
        print(stdout.read().decode('utf-8'))
        
        # List database users
        print("\n3. Listing database users...")
        stdin, stdout, stderr = ssh.exec_command(
            "docker exec kashif-auth-db psql -U postgres -c '\\du' 2>&1 || docker exec kashif-auth-db psql -c '\\du'",
            timeout=30
        )
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        print("Output:", output if output else "None")
        print("Error:", error if error else "None")
        
        # Try to find the actual database user from docker inspect
        print("\n4. Inspecting auth-db container...")
        stdin, stdout, stderr = ssh.exec_command(
            "docker inspect kashif-auth-db | grep -i 'postgres\\|user' | head -20",
            timeout=30
        )
        print(stdout.read().decode('utf-8'))
        
        # Check if we can access the database directly
        print("\n5. Testing database access...")
        test_commands = [
            "docker exec kashif-auth-db psql -c 'SELECT version();'",
            "docker exec kashif-auth-db psql -U auth_user -d auth_db -c 'SELECT 1;'",
            "docker exec kashif-auth-db psql auth_db -c 'SELECT 1;'",
        ]
        
        for cmd in test_commands:
            print(f"\nTrying: {cmd}")
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            if output and "ERROR" not in output and "error" not in output.lower():
                print(f"✓ Success: {output[:200]}")
                break
            else:
                print(f"✗ Failed: {error[:200] if error else 'No output'}")
        
        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
