#!/bin/bash

echo "🚀 Inițializare BookShelf WordPress pentru Kubernetes..."

# Așteaptă MySQL să fie disponibil (fără mysqladmin)
echo "⏳ Așteptăm MySQL să fie disponibil..."

# Simplu wait - MySQL-ul rulează deja
sleep 10

echo "✅ MySQL ar trebui să fie disponibil acum!"

# Actualizează URL-urile pentru Kubernetes dacă sunt setate
if [ -n "$WORDPRESS_HOME" ]; then
    echo "🔗 Configurez URL-urile pentru: $WORDPRESS_HOME"
    # Înlocuiește în wp-config.php
    sed -i "s|http://localhost:8080|$WORDPRESS_HOME|g" /var/www/html/wp-config.php || true
fi

if [ -d "/var/www/html/wp-content/themes/ai-chat-theme" ]; then
    echo "🎨 Activez tema ai-chat-theme..."
    sudo -u www-data wp theme activate ai-chat-theme --path=/var/www/html --allow-root || true
fi

# Setează permisiuni finale
chown -R www-data:www-data /var/www/html

echo "✅ BookShelf WordPress gata pentru Kubernetes!"

# Pornește Apache
exec "$@"