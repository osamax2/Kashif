#!/usr/bin/env python3
"""
Run migration with correct database credentials
"""

import paramiko

SERVER_HOST = "38.127.216.236"
SERVER_USER = "root"
SERVER_PASSWORD = "33Dpf178Lty9pzg_x31O35"
DB_USER = "kashif_auth"
DB_NAME = "kashif_auth"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("=" * 60)
        print("  Running Language Support Migration")
        print("=" * 60)
        print("\nConnecting to server...")
        ssh.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASSWORD, timeout=30)
        print("✓ Connected\n")
        
        # Run migration
        print("1. Running database migration...")
        migration_sql = """
-- Add language column
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;

-- Set default for existing users
UPDATE users SET language = 'ar' WHERE language IS NULL OR language = '';

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Show results
SELECT COUNT(*) as total_users, COALESCE(language, 'NULL') as language 
FROM users 
GROUP BY language;
"""
        
        cmd = f"""docker exec -i kashif-auth-db psql -U {DB_USER} -d {DB_NAME} << 'EOF'
{migration_sql}
EOF"""
        
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        
        if output:
            print("✓ Migration output:")
            print(output)
        if error:
            if "already exists" in error.lower():
                print("  (Column already exists - OK)")
            else:
                print(f"Errors: {error}")
        
        # Verify migration
        print("\n2. Verifying language column...")
        verify_cmd = f"docker exec kashif-auth-db psql -U {DB_USER} -d {DB_NAME} -c \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='users' AND column_name='language';\""
        
        stdin, stdout, stderr = ssh.exec_command(verify_cmd, timeout=30)
        result = stdout.read().decode('utf-8')
        if result and 'language' in result:
            print("✓ Language column verified:")
            print(result)
        else:
            print("✗ Language column not found")
            print(result)
        
        # Check user data
        print("\n3. Checking user language values...")
        check_cmd = f"docker exec kashif-auth-db psql -U {DB_USER} -d {DB_NAME} -c \"SELECT id, email, language FROM users LIMIT 5;\""
        
        stdin, stdout, stderr = ssh.exec_command(check_cmd, timeout=30)
        print(stdout.read().decode('utf-8'))
        
        # Restart service
        print("\n4. Restarting auth service...")
        stdin, stdout, stderr = ssh.exec_command(
            "cd /root/Kashif_backend/Kashif/Backend && docker-compose restart auth-service",
            timeout=60
        )
        print(stdout.read().decode('utf-8'))
        print("✓ Service restarted")
        
        import time
        print("Waiting 5 seconds for service to start...")
        time.sleep(5)
        
        # Test health
        print("\n5. Testing health endpoint...")
        stdin, stdout, stderr = ssh.exec_command(
            "curl -s http://localhost:8001/health",
            timeout=10
        )
        health = stdout.read().decode('utf-8')
        if health:
            print(f"Health response: {health}")
            print("✓ Service is healthy!")
        else:
            print("✗ No response from health endpoint")
        
        # Test from external IP
        print("\n6. Testing from external IP...")
        stdin, stdout, stderr = ssh.exec_command(
            f"curl -s http://{SERVER_HOST}:8001/health",
            timeout=10
        )
        external_health = stdout.read().decode('utf-8')
        if external_health:
            print(f"External health response: {external_health}")
        
        ssh.close()
        
        print("\n" + "=" * 60)
        print("  ✓ Migration Complete!")
        print("=" * 60)
        print("\nNew endpoints available:")
        print(f"  • PATCH http://{SERVER_HOST}:8001/me/language")
        print(f"  • GET http://{SERVER_HOST}:8001/me (includes language field)")
        print("\nTest command:")
        print(f"  curl -X PATCH http://{SERVER_HOST}:8001/me/language \\")
        print("    -H 'Authorization: Bearer YOUR_TOKEN' \\")
        print("    -H 'Content-Type: application/json' \\")
        print("    -d '{\"language\": \"en\"}'")
        print("")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
