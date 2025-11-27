#!/usr/bin/env python3
"""
Check auth service and run manual migration if needed
"""

import time

import paramiko

SERVER_HOST = "38.127.216.236"
SERVER_USER = "root"
SERVER_PASSWORD = "33Dpf178Lty9pzg_x31O35"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting to server...")
        ssh.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASSWORD, timeout=30)
        print("✓ Connected\n")
        
        # Check database user
        print("1. Checking database configuration...")
        stdin, stdout, stderr = ssh.exec_command(
            "docker exec kashif-auth-db psql -U postgres -d auth_db -c '\\du'",
            timeout=30
        )
        print(stdout.read().decode('utf-8'))
        
        # Try migration with postgres user
        print("\n2. Running migration with postgres user...")
        migration_sql = """
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;
UPDATE users SET language = 'ar' WHERE language IS NULL OR language = '';
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
SELECT COUNT(*) as total_users, COALESCE(language, 'NULL') as language FROM users GROUP BY language;
"""
        
        cmd = f"""docker exec -i kashif-auth-db psql -U postgres -d auth_db << 'EOF'
{migration_sql}
EOF"""
        
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if output:
            print("Migration output:")
            print(output)
        if error and "already exists" not in error.lower():
            print(f"Errors: {error}")
        
        # Verify migration
        print("\n3. Verifying language column...")
        stdin, stdout, stderr = ssh.exec_command(
            "docker exec kashif-auth-db psql -U postgres -d auth_db -c \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='users' AND column_name='language';\"",
            timeout=30
        )
        result = stdout.read().decode('utf-8')
        if result:
            print(result)
            if 'language' in result:
                print("✓ Language column exists!")
            else:
                print("✗ Language column not found")
        
        # Check some users
        print("\n4. Checking user language values...")
        stdin, stdout, stderr = ssh.exec_command(
            "docker exec kashif-auth-db psql -U postgres -d auth_db -c \"SELECT id, email, language FROM users LIMIT 5;\"",
            timeout=30
        )
        print(stdout.read().decode('utf-8'))
        
        # Check service logs
        print("\n5. Checking auth service logs...")
        stdin, stdout, stderr = ssh.exec_command(
            "docker logs --tail=30 kashif-auth",
            timeout=30
        )
        logs = stdout.read().decode('utf-8')
        print(logs[-1000:] if len(logs) > 1000 else logs)
        
        # Test health endpoint
        print("\n6. Testing health endpoint...")
        stdin, stdout, stderr = ssh.exec_command(
            "curl -s http://localhost:8001/health",
            timeout=10
        )
        health = stdout.read().decode('utf-8')
        print(f"Health response: {health}")
        
        ssh.close()
        print("\n✓ Check complete!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
    main()
