#!/bin/bash
#############################################
# Kashif Server Security Monitor
# Sends email alerts via docker-mailserver
# Author: Auto-generated for osobaji@gmail.com
#############################################

ALERT_EMAIL="osobaji@gmail.com"
FROM_EMAIL="noreply@hophopsy.com"
HOSTNAME=$(hostname)
SERVER_IP="87.106.51.243"
LOG_FILE="/var/log/server-monitor.log"
STATE_FILE="/var/run/monitor-state"
CPU_THRESHOLD=80
MEM_THRESHOLD=85
DISK_THRESHOLD=85

mkdir -p /var/run

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local body="$2"
    local priority="$3"

    local prefix="WARNING"
    [[ "$priority" == "CRITICAL" ]] && prefix="CRITICAL"
    [[ "$priority" == "INFO" ]] && prefix="INFO"

    local full_subject="[${prefix}] [${HOSTNAME}] ${subject}"

    docker exec mailserver sh -c "printf 'From: Kashif Server Monitor <${FROM_EMAIL}>\nTo: ${ALERT_EMAIL}\nSubject: ${full_subject}\nContent-Type: text/plain; charset=UTF-8\nMIME-Version: 1.0\n\n${body}\n\n---\nServer: ${SERVER_IP} (${HOSTNAME})\nTime: $(date "+%Y-%m-%d %H:%M:%S %Z")\nMonitor: Kashif Security Monitor v1.0\n' | sendmail -f ${FROM_EMAIL} ${ALERT_EMAIL}" 2>/dev/null

    log "ALERT SENT: [${priority}] ${subject}"
}

can_alert() {
    local alert_type="$1"
    local state_key="${STATE_FILE}_${alert_type}"
    local now=$(date +%s)

    if [[ -f "$state_key" ]]; then
        local last_alert=$(cat "$state_key")
        local diff=$((now - last_alert))
        if [[ $diff -lt 3600 ]]; then
            return 1
        fi
    fi
    echo "$now" > "$state_key"
    return 0
}

##########################
# CHECK 1: Crypto Miners
##########################
check_crypto_miners() {
    log "Checking for crypto miners..."

    local miners=""

    # 1) Pattern-based detection for known miner names
    local known_miners
    known_miners=$(ps aux | grep -i -E "xmrig|xmr-stak|minerd|minergate|cpuminer|ethminer|cgminer|bfgminer|systemp|kdevtmpfsi|kinsing" | grep -v grep | grep -v "server-monitor")
    if [[ -n "$known_miners" ]]; then
        miners="$known_miners"
    fi

    # 2) Detect stealth miners: any process using >80% CPU with suspicious patterns
    #    (redirecting to /dev/null, random directory names, zombie miners)
    local stealth_miners
    stealth_miners=$(ps aux --sort=-%cpu | awk 'NR>1 && $3 > 80' | grep -E ">/dev/null|/root/[a-zA-Z0-9]{8,}/|/tmp/backend|\[.*\] <defunct>" | grep -v -E "dockerd|containerd-shim|beam|uvicorn|next-server|server-monitor|node.*kashif")
    if [[ -n "$stealth_miners" ]]; then
        miners="${miners}
${stealth_miners}"
    fi

    # 3) Detect rogue 'npm start' from /app that is NOT inside a Docker container
    local rogue_npm
    rogue_npm=$(ps aux | grep "[n]pm start" | while read -r line; do
        pid=$(echo "$line" | awk '{print $2}')
        cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null)
        hostname_env=$(cat "/proc/$pid/environ" 2>/dev/null | tr '\0' '\n' | grep "^HOSTNAME=")
        # If cwd is /app but no HOSTNAME env (not a container), it's malware
        if [[ "$cwd" == "/app" ]] && [[ -z "$hostname_env" ]]; then
            echo "$line"
        fi
    done)
    if [[ -n "$rogue_npm" ]]; then
        miners="${miners}
${rogue_npm}"
    fi

    # Trim leading/trailing whitespace
    miners=$(echo "$miners" | sed '/^$/d')

    if [[ -n "$miners" ]]; then
        if can_alert "crypto_miner"; then
            send_alert "CRYPTO MINER DETECTED!" "A crypto mining process was detected on the server!\n\nProcesses found:\n${miners}\n\nAuto-killing the processes now." "CRITICAL"
        fi
        echo "$miners" | awk '{print $2}' | xargs -r kill -9 2>/dev/null
        log "CRITICAL: Crypto miner killed automatically!"
    fi

    local mining_conns
    mining_conns=$(ss -tnp state established 2>/dev/null | grep -E ":3333 |:4444 |:5555 |:14444 |:45700 |:14433 |:9999 ")
    if [[ -n "$mining_conns" ]]; then
        if can_alert "mining_conn"; then
            send_alert "MINING POOL CONNECTION DETECTED!" "Connections to known mining pools detected!\n\n${mining_conns}" "CRITICAL"
        fi
        echo "$mining_conns" | awk '{print $NF}' | grep -oP 'pid=\K[0-9]+' | xargs -r kill -9 2>/dev/null
        log "CRITICAL: Mining pool connections killed!"
    fi
}

##########################
# CHECK 2: High CPU Usage
##########################
check_cpu_usage() {
    log "Checking CPU usage..."

    local high_cpu
    high_cpu=$(ps aux --sort=-%cpu | awk -v thresh="$CPU_THRESHOLD" 'NR>1 && $3 > thresh {printf "%s PID=%s CPU=%s%% CMD=%s\n", $1, $2, $3, $11}' | head -5)

    if [[ -n "$high_cpu" ]]; then
        if can_alert "high_cpu"; then
            send_alert "HIGH CPU USAGE DETECTED" "Processes consuming more than ${CPU_THRESHOLD}% CPU:\n\n${high_cpu}\n\nThis could indicate a crypto miner or other malicious activity." "WARNING"
        fi
    fi
}

##########################
# CHECK 3: Suspicious Systemd Services
##########################
check_systemd_services() {
    log "Checking for suspicious systemd services..."

    local new_services
    new_services=$(find /etc/systemd/system/ -maxdepth 1 -name "*.service" -mtime -1 -type f ! -name "kashif-monitor.service" ! -name "fail2ban.service" 2>/dev/null)

    if [[ -n "$new_services" ]]; then
        local details=""
        for svc_file in $new_services; do
            local content
            content=$(cat "$svc_file" 2>/dev/null)
            details="${details}\n--- ${svc_file} ---\n${content}\n"
        done
        if can_alert "new_service"; then
            send_alert "NEW SYSTEMD SERVICE DETECTED" "New systemd service files created in the last 24 hours:\n\n${new_services}\n\nContents:\n${details}\n\nThis could indicate malware persistence!" "CRITICAL"
        fi
    fi
}

##########################
# CHECK 4: SSH Brute Force
##########################
check_ssh_bruteforce() {
    log "Checking for SSH brute force..."

    local failed_count
    failed_count=$(grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %_d')" | wc -l)

    if [[ $failed_count -gt 50 ]]; then
        local top_attackers
        top_attackers=$(grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %_d')" | grep -oP 'from \K[0-9.]+' | sort | uniq -c | sort -rn | head -10)
        if can_alert "ssh_brute"; then
            send_alert "SSH BRUTE FORCE ATTACK" "Detected ${failed_count} failed SSH login attempts today!\n\nTop attacking IPs:\n${top_attackers}" "WARNING"
        fi
    fi
}

##########################
# CHECK 5: Docker Containers
##########################
check_docker_containers() {
    log "Checking Docker containers..."

    local expected_containers="kashif-admin kashif-gateway kashif-reporting kashif-auth kashif-notification kashif-gamification kashif-coupons kashif-pothole-detection"

    for container in $expected_containers; do
        local status
        status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
        if [[ "$status" != "running" ]]; then
            if can_alert "container_${container}"; then
                local logs
                logs=$(docker logs --tail 10 "$container" 2>&1)
                send_alert "CONTAINER DOWN: ${container}" "Docker container ${container} is NOT running!\n\nStatus: ${status:-not found}\n\nLast logs:\n${logs}\n\nAttempting auto-restart..." "CRITICAL"
            fi
            docker start "$container" 2>/dev/null
            log "Auto-restarted container: ${container}"
        fi
    done
}

##########################
# CHECK 6: Disk Space
##########################
check_disk_space() {
    log "Checking disk space..."

    local disk_usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | tr -d '%')

    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        local disk_info
        disk_info=$(df -h /)
        if can_alert "disk_space"; then
            send_alert "DISK SPACE LOW (${disk_usage}%)" "Disk usage has exceeded ${DISK_THRESHOLD}%!\n\n${disk_info}" "WARNING"
        fi
    fi
}

##########################
# CHECK 7: Memory Usage
##########################
check_memory() {
    log "Checking memory usage..."

    local mem_usage
    mem_usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

    if [[ $mem_usage -gt $MEM_THRESHOLD ]]; then
        local top_mem
        top_mem=$(ps aux --sort=-%mem | awk 'NR<=6 {printf "%s PID=%s MEM=%s%% CMD=%s\n", $1, $2, $4, $11}')
        if can_alert "memory"; then
            send_alert "HIGH MEMORY USAGE (${mem_usage}%)" "Memory usage: ${mem_usage}%\n\nTop consumers:\n${top_mem}" "WARNING"
        fi
    fi
}

##########################
# CHECK 8: Suspicious Files
##########################
check_suspicious_files() {
    log "Checking for suspicious files..."

    local suspicious_files=""

    local tmp_exec
    tmp_exec=$(find /tmp -maxdepth 1 -executable -type f ! -name "tmp.*" 2>/dev/null | head -20)
    [[ -n "$tmp_exec" ]] && suspicious_files="${suspicious_files}Executable files in /tmp:\n${tmp_exec}\n\n"

    local new_bins
    new_bins=$(find /usr/local/bin -mtime -1 -type f 2>/dev/null)
    [[ -n "$new_bins" ]] && suspicious_files="${suspicious_files}New files in /usr/local/bin (last 24h):\n${new_bins}\n\n"

    local hidden_dirs
    hidden_dirs=$(find /root -maxdepth 1 -name ".*" -type d ! -name ".ssh" ! -name ".config" ! -name ".cache" ! -name ".docker" ! -name ".npm" ! -name ".local" ! -name "." 2>/dev/null)
    [[ -n "$hidden_dirs" ]] && suspicious_files="${suspicious_files}Suspicious hidden dirs in /root:\n${hidden_dirs}\n\n"

    local cron_jobs
    cron_jobs=$(crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" | grep -v "monitor\.py" | grep -v "kashif-monitor")
    [[ -n "$cron_jobs" ]] && suspicious_files="${suspicious_files}Cron jobs found:\n${cron_jobs}\n\n"

    if [[ -n "$suspicious_files" ]]; then
        if can_alert "suspicious_files"; then
            send_alert "SUSPICIOUS FILES DETECTED" "Suspicious files or changes detected:\n\n${suspicious_files}" "WARNING"
        fi
    fi
}

##########################
# CHECK 9: SSH Keys Changed
##########################
check_ssh_keys() {
    log "Checking SSH authorized keys..."

    local key_hash
    key_hash=$(md5sum /root/.ssh/authorized_keys 2>/dev/null | awk '{print $1}')
    local saved_hash_file="/var/run/monitor-ssh-hash"

    if [[ -f "$saved_hash_file" ]]; then
        local saved_hash
        saved_hash=$(cat "$saved_hash_file")
        if [[ "$key_hash" != "$saved_hash" ]]; then
            local keys
            keys=$(cat /root/.ssh/authorized_keys)
            if can_alert "ssh_keys"; then
                send_alert "SSH AUTHORIZED KEYS CHANGED!" "The SSH authorized_keys file has been modified!\n\nCurrent keys:\n${keys}\n\nThis could indicate unauthorized access!" "CRITICAL"
            fi
        fi
    fi
    echo "$key_hash" > "$saved_hash_file"
}

##########################
# CHECK 10: Outbound Connections
##########################
check_outbound_connections() {
    log "Checking outbound connections..."

    local suspicious_conns
    suspicious_conns=$(ss -tnp state established 2>/dev/null | awk '$4 !~ /127\.0\.0\.1|::1|172\.(1[6-9]|2[0-9]|3[01])/ && $4 !~ /:(25|53|80|443|587|465|993) / {print}' | grep -v "sshd" | grep -v "nginx" | grep -v ":22 ")

    local conn_count
    conn_count=$(echo "$suspicious_conns" | grep -c "." 2>/dev/null)

    if [[ $conn_count -gt 20 ]]; then
        if can_alert "outbound_conns"; then
            send_alert "UNUSUAL OUTBOUND CONNECTIONS" "Detected ${conn_count} unusual outbound connections:\n\n$(echo "$suspicious_conns" | head -20)" "WARNING"
        fi
    fi
}

##########################
# MAIN LOOP
##########################
log "=== Server Monitor Started ==="
log "Alert email: ${ALERT_EMAIL}"

send_alert "Server Monitor Started" "The Kashif Server Security Monitor has been started.\n\nMonitoring:\n- Crypto miners (auto-kill)\n- High CPU/Memory usage\n- Suspicious systemd services\n- SSH brute force attacks\n- Docker container health (auto-restart)\n- Disk space\n- Suspicious files and cron jobs\n- SSH key changes\n- Unusual outbound connections\n\nAlerts: ${ALERT_EMAIL}\nInterval: 60 seconds" "INFO"

while true; do
    check_crypto_miners
    check_cpu_usage
    check_systemd_services
    check_ssh_bruteforce
    check_docker_containers
    check_disk_space
    check_memory
    check_suspicious_files
    check_ssh_keys
    check_outbound_connections

    sleep 60
done
