# TICKET-025: Docker Container Runs as Root User

**Title**: Docker Dockerfile Has No USER Directive - Runs as Root
**Type**: Security
**Priority**: High
**Description**: The Dockerfile uses node:22-slim base image and runs as root user. If an attacker gains code execution within the container, they have full system access. Docker containers running as root can be escaped to host system.
**Steps to Reproduce** (if applicable):
1. Build and run the Docker container
2. Check user: docker exec -it <container> whoami
3. Observe output is 'root'
**Expected Behavior**: Dockerfile should include USER directive to run as non-root user (e.g., USER node).
**Actual Behavior**: Dockerfile line 5 uses node:22-slim with no USER directive before CMD.
**Suggested Fix / Approach**: Add 'USER node' directive before CMD, or create dedicated user: RUN useradd -m appuser && chown -R appuser /app && USER appuser
**Affected Files**:
- borongan-eService-system-copy/Dockerfile (line 5)
- barangay-information-management-system-copy/Dockerfile (similar issue)