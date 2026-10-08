# Easypanel Step-by-Step Deployment Guide
## Aether Messenger (Developed by Allientic Lab Technologies)

This guide walks you through deploying **Aether Messenger** on **Easypanel** in just a few minutes with automated SSL, WebSocket support, and one-click database management.

---

### Platform Details
- **Developer:** Allientic Lab Technologies
- **Official Production Domain:** `Aether.xperiserv.in`
- **Contact / Support Email:** `support@xperiserv.in`
- **Default Country Code:** `+91` (India)
- **Container Port:** `3000`

---

## Prerequisites
1. A server (VPS from Hetzner, DigitalOcean, Linode, AWS, Contabo, etc.) with Docker and Easypanel installed (`curl -sSL https://get.easypanel.io | sh`).
2. Your DNS record configured:
   - Point an **A Record** for `Aether.xperiserv.in` (or your subdomain) to your VPS IP address.

---

## Method 1: Deploy via GitHub / Git Repository (Recommended)

### Step 1: Push Your Code to Git
Push this project to a repository on GitHub or GitLab:
```bash
git init
git add .
git commit -m "feat: production aether messenger"
git remote add origin https://github.com/your-username/aether-messenger.git
git push -u origin main
```

### Step 2: Create a New App in Easypanel
1. Open your Easypanel dashboard (e.g. `http://YOUR_SERVER_IP:3000` or `https://panel.yourdomain.com`).
2. Click into your **Project** (e.g., `default` or create a new project `aether`).
3. Click the **+ Service** button and choose **App**.
4. Set the service name to `aether` and click **Create**.

### Step 3: Configure Source & Build
1. In the service settings, select the **Source** tab:
   - Choose **GitHub** (or **Git Repository**).
   - Select your repository (`your-username/aether-messenger`) and branch (`main`).
2. Under **Build Method**:
   - Select **Dockerfile**.
   - Dockerfile path: `./Dockerfile`.

### Step 4: Configure Environment Variables
Navigate to the **Environment** tab and add the following variables:
```env
NODE_ENV=production
PORT=3000
APP_URL=https://Aether.xperiserv.in
```

### Step 5: Configure Port
Navigate to the **Ports** tab:
- Ensure the internal container port is set to `3000`.

### Step 6: Configure Domain & Free SSL
Navigate to the **Domains** tab:
1. Click **+ Add Domain**.
2. Enter your domain: `Aether.xperiserv.in`.
3. Ensure HTTPS is toggled ON.
   > **Note on WebSockets:** Easypanel uses Traefik as its reverse proxy. Traefik automatically supports WebSocket upgrades (`Upgrade: websocket`) and TLS 1.3 encryption without requiring any custom proxy headers!

### Step 7: Deploy
Click the **Deploy** button in the top right.
Easypanel will:
1. Clone the repository.
2. Build the multi-stage Docker container (compiling Vite assets and installing production Node dependencies).
3. Start the Node.js server.
4. Issue a free Let's Encrypt SSL certificate.
5. Route live traffic to your domain.

---

## Method 2: Deploy via Docker Compose in Easypanel

1. In Easypanel, click **+ Service** &rarr; select **Docker Compose**.
2. Paste the contents of `docker-compose.yml`:
```yaml
version: '3.8'

services:
  aether-messenger:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: aether-messenger
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - APP_URL=https://Aether.xperiserv.in
```
3. Set your domain to `Aether.xperiserv.in` and click **Deploy**.

---

## Post-Deployment: Initial Super Admin Login

Once the build finishes and is green:
1. Visit `https://Aether.xperiserv.in`.
2. Click **Sign In** and log in with the master administrator credentials:
   - **Identifier (Email / Username):** `admin` (or `support@xperiserv.in`)
   - **Password:** `AdminPass2026!`
3. You will have full access to the **Admin Console** (`/admin`), where you can:
   - Control verified marks for any user.
   - Configure your live SMTP keys and sender email.
   - Perform 1-click database backups and restores.
   - Broadcast announcements.
   - Review audit logs and moderate content.

---

## In-App Database Backup & Restore on Easypanel

To safeguard your data or migrate between servers:
1. Open the **Admin Console** &rarr; click **Backup & Restore**.
2. **1-Click Backup:** Click **"1-Click Backup Now"** to generate an instant snapshot.
3. **Download File:** Click **"Download Full DB (.json)"** to download the complete database archive to your computer.
4. **1-Click Restore:** Click **"Restore This Snapshot"** or upload any `.json` backup file to restore the entire database state.

---

## In-App SMTP Configuration

To configure transactional emails (OTP codes, password resets, welcome alerts):
1. Open **Admin Console** &rarr; **Email & SMTP**.
2. Enter:
   - **Host:** e.g., `smtp.sendgrid.net`, `smtp.gmail.com`, or your mail server.
   - **Port:** `587` (STARTTLS) or `465` (SSL).
   - **Username / API Key:** Your SMTP username or API key.
   - **Password:** Your SMTP secret or password.
   - **From Email:** `support@xperiserv.in`.
3. Click **Save SMTP Settings**.
4. Enter an email in the test box and click **Send Test Email** to verify delivery.

---

## Support & Assistance
- **Developer:** Allientic Lab Technologies
- **Website:** [Aether.xperiserv.in](https://Aether.xperiserv.in)
- **Email:** [support@xperiserv.in](mailto:support@xperiserv.in)
