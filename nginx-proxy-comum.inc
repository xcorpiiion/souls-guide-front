# Trechos repetidos por todo location de proxy. Extensão .inc de propósito: o nginx
# carrega sozinho /etc/nginx/conf.d/*.conf, e este arquivo é um fragmento, não um server.

proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Preparado para streaming, que hoje NAO existe: nao ha SSE em nenhum servico deste
# stack -- a navbar pergunta o unread-count de minuto em minuto, e o aviso com o site
# fechado vai por Web Push, que nao passa por aqui. Estas quatro linhas ficam porque
# nao custam nada e, no dia em que houver streaming, com buffering ligado o nginx
# seguraria os eventos ate encher o buffer. Connection "" evita que o cabecalho
# hop-by-hop feche o keep-alive do upstream.
proxy_http_version 1.1;
proxy_set_header Connection "";
proxy_buffering off;
proxy_read_timeout 3600s;
