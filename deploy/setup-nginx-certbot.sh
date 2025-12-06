#!/bin/bash
set -e

# Usage: sudo ./setup-nginx-certbot.sh your.domain.example
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo $0 your.domain.example"
  exit 1
fi

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo $0 your.domain.example"
  exit 1
fi

# Install nginx and certbot
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Create webroot for certbot
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

# Install nginx site
NGINX_SITE=/etc/nginx/sites-available/aethra
cat > $NGINX_SITE <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /p2p/ {
        proxy_pass http://127.0.0.1:7100/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

ln -sf $NGINX_SITE /etc/nginx/sites-enabled/aethra
nginx -t
systemctl reload nginx

# Obtain TLS certificate using certbot nginx plugin
certbot --nginx -d "$DOMAIN" --noninteractive --agree-tos -m admin@$DOMAIN

# Reload nginx
systemctl reload nginx

echo "nginx + certbot setup complete for $DOMAIN"
