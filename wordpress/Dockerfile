# Multi-stage build pentru WordPress optimizat
FROM wordpress:latest as base

# Stage 1: Pregătire conținut cu optimizări
FROM base as content-builder
COPY wordpress-export/html/ /tmp/html/
COPY uploads.ini /tmp/uploads.ini

# Optimizări majore - elimină fișiere mari care nu afectează funcționalitatea
RUN cd /tmp/html && \
    # Elimină fișierele de traducere mari (păstrează doar .mo compilate)
    find . -name "*.po" -size +1M -delete && \
    find . -name "*.pot" -delete && \
    # Elimină log-uri și cache-uri
    find . -name "*.log" -delete && \
    find . -name "debug.log" -delete && \
    find . -name "error_log" -delete && \
    # Elimină fișiere backup și temporare
    find . -name "*.bak" -delete && \
    find . -name "*.tmp" -delete && \
    find . -name "*~" -delete && \
    # Elimină documentația care nu e necesară pentru funcționare
    rm -rf wp-content/languages/themes/*/documentation/ 2>/dev/null || true && \
    rm -rf wp-content/languages/plugins/*/documentation/ 2>/dev/null || true

# Stage 2: Imagine finală optimizată
FROM wordpress:latest

# Copiază conținutul optimizat
COPY --from=content-builder /tmp/html/ /var/www/html/
COPY --from=content-builder /tmp/uploads.ini /usr/local/etc/php/conf.d/

# Script de inițializare
COPY init-wordpress.sh /usr/local/bin/init-wordpress.sh
RUN chmod +x /usr/local/bin/init-wordpress.sh

# Cleanup final agresiv
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    # Elimină mai multe cache-uri
    rm -rf /var/cache/apt/* && \
    rm -rf /usr/share/man/* && \
    rm -rf /usr/share/doc/* && \
    # Cleanup WordPress specific
    find /var/www/html -name "*.log" -delete && \
    find /var/www/html -name "debug.log" -delete

# Setează permisiuni
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/init-wordpress.sh"]
CMD ["apache2-foreground"]