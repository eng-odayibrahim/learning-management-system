# LMS VPS Production Deployment Guide

This guide explains how to deploy the LMS application to a production VPS (Ubuntu/Debian) using Docker Compose, Nginx, and SSL.

---

## 1. Prerequisites on the VPS

Update packages and install Docker with Docker Compose plugin:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose plugin
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
sudo systemctl enable --now docker

# Optional: Allow non-root user to run Docker
sudo usermod -aG docker $USER
newgrp docker
```

Configure the firewall (UFW):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> **Security Note:** Ports `27017` (MongoDB), `6379` (Redis), and `5672` (RabbitMQ) are **never** opened to the public internet. They run securely inside the internal Docker network.

---

## 2. Clone the Project & Set Environment Variables

Clone your repository to the VPS:

```bash
cd /opt
git clone <your-repository-url> lms
cd lms
```

Create your production environment file from the template:

```bash
cp .env.production.example .env.production
```

### Generate JWT Secrets:

Run the following command twice on the server to generate two distinct, cryptographically strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Edit `.env.production` with your favorite editor:

```bash
nano .env.production
```

Fill in:
- `MONGO_INITDB_ROOT_PASSWORD` and update `MONGO_URI` with the same password.
- `REDIS_PASSWORD` and update `REDIS_URL`.
- `RABBITMQ_DEFAULT_PASS` and update `RABBITMQ_URL`.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (the generated secrets).
- `CLIENT_URL` and `NEXT_PUBLIC_API_URL` (set to your domain, e.g. `https://your-domain.com` or `http://your-vps-ip`).
- `R2_*` credentials (Cloudflare R2 private bucket).
- `ADMIN_BOOTSTRAP_*` credentials for the first admin user.
- `GEMINI_API_KEY` for AI quiz generation.

---

## 3. Starting the Environments

### Development Mode (Local or staging server):

```bash
# Start development stack (with hot-reload and source bind mounts)
docker compose -f docker-compose.dev.yml up -d --build

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop development stack
docker compose -f docker-compose.dev.yml down
```

### Production Mode (VPS):

```bash
# Build and launch all production containers in the background
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verify all services are running and healthy
docker compose -f docker-compose.prod.yml ps

# View live application logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f client
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

## 4. Bootstrap the First Administrator Account

Once the production stack is up and healthy, run the admin seed script inside the running API container:

```bash
docker compose -f docker-compose.prod.yml exec api npm run seed:admin
```

This will create the first administrator account using the `ADMIN_BOOTSTRAP_*` credentials defined in your `.env.production`.

---

## 5. Enable HTTPS / SSL with Let's Encrypt (Certbot)

To secure your production domain with free, automated SSL certificates:

1. Point your domain's **A Record** (e.g., `your-domain.com` and `www.your-domain.com`) to your VPS public IP address in your DNS manager.

2. Run Certbot via Docker to request the certificate:
   ```bash
   docker run --rm -it \
     -v lms_certbot_www:/var/www/certbot \
     -v lms_certbot_conf:/etc/letsencrypt \
     certbot/certbot certonly --webroot \
     --webroot-path=/var/www/certbot \
     -d your-domain.com -d www.your-domain.com \
     --email admin@your-domain.com --agree-tos --no-eff-email
   ```

3. Enable the SSL configuration in Nginx:
   ```bash
   # Copy the SSL template
   cp nginx/conf.d/ssl.conf.example nginx/conf.d/default.conf

   # Replace "your-domain.com" with your actual domain name
   sed -i 's/your-domain.com/your-real-domain.com/g' nginx/conf.d/default.conf

   # Reload Nginx without downtime
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

4. Setup automatic certificate renewal with a cron job:
   ```bash
   (crontab -l 2>/dev/null; echo "0 3 * * * docker run --rm -v lms_certbot_www:/var/www/certbot -v lms_certbot_conf:/etc/letsencrypt certbot/certbot renew --quiet && docker compose -f /opt/lms/docker-compose.prod.yml exec nginx nginx -s reload") | crontab -
   ```

---

## 6. Accessing RabbitMQ Management UI Securely

RabbitMQ management UI is bound to `127.0.0.1:15672` to protect it from public internet attacks.

To access it from your local machine, open an SSH tunnel:

```bash
ssh -L 15672:localhost:15672 user@your-vps-ip
```

Then open `http://localhost:15672` in your local browser and log in with `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS`.

---

## 7. Database Backups & Restore

### Create a MongoDB Backup:

```bash
# Dump the database to a compressed archive
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongodump --username lms_admin --password "<your-mongo-password>" --authenticationDatabase admin --db lmsdb --archive --gzip > backup_$(date +%Y%m%d_%H%M%S).gz
```

### Restore MongoDB from Backup:

```bash
cat backup_filename.gz | docker compose -f docker-compose.prod.yml exec -T mongo \
  mongorestore --username lms_admin --password "<your-mongo-password>" --authenticationDatabase admin --archive --gzip --drop
```

---

## 8. Applying Code Updates in Production

When updating code on the VPS:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker system prune -f
```
