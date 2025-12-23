#!/usr/bin/env python3
"""
Script to upload Backend changes to the server
"""
import os
import subprocess
import sys

# Server configuration
SERVER_USER = "root"
SERVER_HOST = "87.106.51.243"
SERVER_PASSWORD = "33Dpf178Lty9pzg_x31O35"
# Root user's path
REMOTE_BASE = "/root/Kashif/Backend"

# Files to upload
FILES_TO_UPLOAD = [
    ("auth-service/rabbitmq_consumer.py", f"{REMOTE_BASE}/auth-service/rabbitmq_consumer.py"),
    ("auth-service/crud.py", f"{REMOTE_BASE}/auth-service/crud.py"),
    ("auth-service/main.py", f"{REMOTE_BASE}/auth-service/main.py"),
    ("gamification-service/rabbitmq_consumer.py", f"{REMOTE_BASE}/gamification-service/rabbitmq_consumer.py"),
    ("gamification-service/main.py", f"{REMOTE_BASE}/gamification-service/main.py"),
]

def run_scp(local_file, remote_path):
    """Upload a file using scp"""
    remote_dest = f"{SERVER_USER}@{SERVER_HOST}:{remote_path}"
    
    print(f"Uploading {local_file} to {remote_path}...")
    
    # Use scp with password via sshpass if available, otherwise manual
    try:
        # Try with sshpass first
        cmd = ["sshpass", "-p", SERVER_PASSWORD, "scp", local_file, remote_dest]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Successfully uploaded {local_file}")
            return True
    except FileNotFoundError:
        # sshpass not available, use regular scp
        cmd = ["scp", local_file, remote_dest]
        print(f"Running: scp {local_file} {remote_dest}")
        print("Enter password when prompted: 33Dpf178Lty9pzg_x31O35")
        result = subprocess.run(cmd)
        if result.returncode == 0:
            print(f"✅ Successfully uploaded {local_file}")
            return True
    
    print(f"❌ Failed to upload {local_file}")
    return False

def main():
    print("=" * 60)
    print("Uploading Backend Changes to Server")
    print("=" * 60)
    print()
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    success_count = 0
    fail_count = 0
    
    for local_file, remote_path in FILES_TO_UPLOAD:
        if os.path.exists(local_file):
            if run_scp(local_file, remote_path):
                success_count += 1
            else:
                fail_count += 1
        else:
            print(f"⚠️  File not found: {local_file}")
            fail_count += 1
        print()
    
    print("=" * 60)
    print(f"Upload Summary: {success_count} succeeded, {fail_count} failed")
    print("=" * 60)
    print()
    
    if success_count > 0:
        print("Next steps:")
        print("1. SSH to the server:")
        print(f"   ssh {SERVER_USER}@{SERVER_HOST}")
        print()
        print("2. Navigate to the Backend directory:")
        print(f"   cd {REMOTE_BASE}")
        print()
        print("3. Restart the services:")
        print("   docker-compose restart auth-service gamification-service")
        print()
        print("4. Check the logs:")
        print("   docker-compose logs -f auth-service gamification-service")

if __name__ == "__main__":
    main()
