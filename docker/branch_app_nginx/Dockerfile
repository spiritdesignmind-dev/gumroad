FROM openresty/openresty:jessie

# Expire Docker images after 1 week in Quay
LABEL quay.expires-after=1w

# No external Lua modules needed; use built-in OpenResty libs

COPY docker/branch_app_nginx/conf/default.conf /etc/nginx/conf.d/default.conf

CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
