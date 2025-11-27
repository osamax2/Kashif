#!/usr/bin/env python3
"""
Explore server directory structure
"""

import paramiko

SERVER_HOST = "38.127.216.236"
SERVER_USER = "root"
SERVER_PASSWORD = "33Dpf178Lty9pzg_x31O35"

def explore_server():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print("Connecting to server...")
        ssh.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASSWORD, timeout=30)
        print("✓ Connected\n")
        
        # Check various directories
        commands = [
            ("Home directory", "pwd"),
            ("List home", "ls -la"),
            ("Find Kashif", "find / -name 'Kashif' -type d 2>/dev/null | head -10"),
            ("Find docker containers", "docker ps -a"),
            ("Find docker-compose", "find / -name 'docker-compose.yml' 2>/dev/null | head -10"),
            ("Check auth service", "docker ps | grep auth"),
            ("Check postgres", "docker ps | grep postgres"),
        ]
        
        for desc, cmd in commands:
            print(f"\n{'='*60}")
            print(f"{desc}:")
            print(f"Command: {cmd}")
            print('-'*60)
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')
            
            if output:
                print(output)
            if error and "No such file" not in error:
                print(f"Error: {error}")
        
        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    explore_server()
