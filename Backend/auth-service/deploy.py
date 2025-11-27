#!/usr/bin/env python3
"""
Automated deployment script for language support feature
Uses paramiko for SSH operations
"""

import os
import sys
from pathlib import Path

import paramiko

# Server configuration
SERVER_HOST = "38.127.216.236"
SERVER_PORT = 22
SERVER_USER = "root"
SERVER_PASSWORD = "33Dpf178Lty9pzg_x31O35"
REMOTE_PATH = "/root/Kashif_backend/Kashif/Backend/auth-service"
BACKEND_PATH = "/root/Kashif_backend/Kashif/Backend"
AUTH_DB_CONTAINER = "kashif-auth-db"
AUTH_SERVICE_CONTAINER = "kashif-auth"

# Colors
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'

def print_step(step_num, message):
    print(f"\n{YELLOW}Step {step_num}: {message}{NC}")

def print_success(message):
    print(f"{GREEN}✓ {message}{NC}")

def print_error(message):
    print(f"{RED}✗ {message}{NC}")

def connect_ssh():
    """Establish SSH connection to server"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {SERVER_HOST}...")
        ssh.connect(
            hostname=SERVER_HOST,
            port=SERVER_PORT,
            username=SERVER_USER,
            password=SERVER_PASSWORD,
            timeout=30
        )
        print_success("Connected to server")
        return ssh
    except Exception as e:
        print_error(f"Failed to connect: {e}")
        return None

def upload_file(sftp, local_file, remote_file):
    """Upload a single file"""
    try:
        sftp.put(local_file, remote_file)
        print_success(f"Uploaded {os.path.basename(local_file)}")
        return True
    except Exception as e:
        print_error(f"Failed to upload {local_file}: {e}")
        return False

def execute_command(ssh, command, description=""):
    """Execute a command on the server"""
    try:
        if description:
            print(f"  {description}...")
        stdin, stdout, stderr = ssh.exec_command(command, timeout=60)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        exit_code = stdout.channel.recv_exit_status()
        
        if exit_code == 0:
            if output:
                print(output)
            return True
        else:
            print_error(f"Command failed: {error}")
            return False
    except Exception as e:
        print_error(f"Error executing command: {e}")
        return False

def main():
    print("=" * 60)
    print("  Deploying Language Support Feature")
    print("=" * 60)
    
    # Connect to server
    ssh = connect_ssh()
    if not ssh:
        sys.exit(1)
    
    try:
        sftp = ssh.open_sftp()
        
        # Step 1: Upload files
        print_step(1, "Uploading files to server")
        files_to_upload = [
            'models.py',
            'schemas.py',
            'crud.py',
            'main.py'
        ]
        
        for filename in files_to_upload:
            local_path = filename
            remote_path = f"{REMOTE_PATH}/{filename}"
            if os.path.exists(local_path):
                upload_file(sftp, local_path, remote_path)
            else:
                print_error(f"File not found: {filename}")
        
        sftp.close()
        print_success("All files uploaded")
        
        # Step 2: Run database migration
        print_step(2, "Running database migration")
        migration_sql = """
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;
UPDATE users SET language = 'ar' WHERE language IS NULL OR language = '';
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
SELECT COUNT(*) as total_users, language FROM users GROUP BY language;
"""
        
        migration_command = f"""docker exec -i {AUTH_DB_CONTAINER} psql -U kashif -d auth_db << 'EOF'
{migration_sql}
EOF"""
        
        if execute_command(ssh, f"cd {REMOTE_PATH} && {migration_command}", "Applying migration"):
            print_success("Database migration completed")
        else:
            print_error("Migration failed")
        
        # Step 3: Verify migration
        print_step(3, "Verifying database changes")
        verify_command = f"docker exec -it {AUTH_DB_CONTAINER} psql -U kashif -d auth_db -c \"\\d users\" | grep language"
        execute_command(ssh, verify_command, "Checking language column")
        
        # Step 4: Restart auth service
        print_step(4, "Restarting auth service")
        if execute_command(ssh, f"cd {BACKEND_PATH} && docker-compose restart auth-service", "Restarting service"):
            print_success("Service restarted")
            print("Waiting for service to be ready...")
            import time
            time.sleep(5)
        
        # Step 5: Check service status
        print_step(5, "Checking service status")
        execute_command(ssh, f"cd {BACKEND_PATH} && docker-compose ps auth-service", "Getting service status")
        
        # Step 6: Test health endpoint
        print_step(6, "Testing health endpoint")
        import urllib.request
        try:
            response = urllib.request.urlopen(f"http://{SERVER_HOST}:8001/health", timeout=10)
            health_data = response.read().decode('utf-8')
            print(f"Health check response: {health_data}")
            print_success("Service is healthy")
        except Exception as e:
            print_error(f"Health check failed: {e}")
        
        print("\n" + "=" * 60)
        print(f"{GREEN}  Deployment Complete!{NC}")
        print("=" * 60)
        print("\nNew endpoints available:")
        print("  • PATCH /me/language - Update language preference")
        print("  • GET /me - Now includes 'language' field")
        print("\nTest with:")
        print(f"  curl -X PATCH http://{SERVER_HOST}:8001/me/language \\")
        print("    -H 'Authorization: Bearer YOUR_TOKEN' \\")
        print("    -H 'Content-Type: application/json' \\")
        print("    -d '{\"language\": \"en\"}'")
        
    except Exception as e:
        print_error(f"Deployment failed: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    # Check if paramiko is installed
    try:
        import paramiko
    except ImportError:
        print_error("paramiko is not installed. Installing...")
        os.system("pip3 install paramiko")
        print("Please run the script again.")
        sys.exit(1)
    
    main()
    main()
