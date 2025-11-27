#!/usr/bin/expect -f
# Automated deployment script using expect for password authentication

set timeout 120
set server "38.127.216.236"
set password "33Dpf178Lty9pzg_x31O35"

puts "=================================================="
puts "  Deploying Language Support Feature"
puts "=================================================="
puts ""

# Upload files
puts "\nStep 1: Uploading files to server..."

foreach file {models.py schemas.py crud.py main.py} {
    spawn scp $file root@$server:/root/Kashif_backend/Kashif/Backend/auth-service/
    expect {
        "password:" {
            send "$password\r"
            expect eof
        }
        "yes/no" {
            send "yes\r"
            expect "password:"
            send "$password\r"
            expect eof
        }
    }
}

puts "✓ Files uploaded\n"

# SSH and run commands
puts "Step 2: Running migration and restarting service..."

spawn ssh root@$server
expect {
    "password:" {
        send "$password\r"
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "$password\r"
    }
}

expect "root@"
send "cd /root/Kashif/Backend/auth-service\r"
expect "root@"

# Run migration
send "docker exec -i postgres_container psql -U kashif -d auth_db << 'EOF'\r"
send "ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'ar' NOT NULL;\r"
send "UPDATE users SET language = 'ar' WHERE language IS NULL OR language = '';\r"
send "CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);\r"
send "SELECT COUNT(*) as total_users, language FROM users GROUP BY language;\r"
send "EOF\r"

expect "root@"
sleep 2

# Restart service
send "cd /root/Kashif/Backend\r"
expect "root@"
send "docker-compose restart auth-service\r"
expect "root@"
sleep 5

# Check status
send "docker-compose ps auth-service\r"
expect "root@"
sleep 2

send "exit\r"
expect eof

puts "\n=================================================="
puts "  Deployment Complete!"
puts "=================================================="
puts "\nTest with: curl http://38.127.216.236:8001/health"
