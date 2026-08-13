# Trechos repetidos por todo location de proxy. Extensão .inc de propósito: o nginx
# carrega sozinho /etc/nginx/conf.d/*.conf, e este arquivo é um fragmento, não um server.

proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# As notificações chegam por SSE, e SSE com buffering ligado não chega: o nginx segura
# os eventos esperando encher o buffer, e o navegador só recebe tudo quando a conexão
# cai. Connection "" evita que o cabeçalho hop-by-hop feche o keep-alive do upstream.
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_buffering off;
proxy_read_timeout 3600s;
