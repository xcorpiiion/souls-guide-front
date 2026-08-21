Write-Host "Buildando soulguide-front..." -ForegroundColor Cyan

# O build instala @xcorpiiion/canonico do GitHub Packages, que exige token com
# escopo read:packages. Falhar aqui é melhor que falhar dentro do docker build
# com um 401 sem contexto.
if (-not $env:PACKAGES_TOKEN)
{
    Write-Host "ERRO: variavel PACKAGES_TOKEN nao definida." -ForegroundColor Red
    Write-Host "      O front depende de @xcorpiiion/canonico (GitHub Packages)." -ForegroundColor Yellow
    Write-Host '      Defina com: $env:PACKAGES_TOKEN = "<seu-PAT-com-read:packages>"' -ForegroundColor Yellow
    Write-Host "      Ou ponha PACKAGES_TOKEN no .env de Back-end\soulsguide e rode o" -ForegroundColor Yellow
    Write-Host "      ./build-all.ps1, que carrega o arquivo antes de construir." -ForegroundColor Yellow
    exit 1
}

# Duas imagens do mesmo Dockerfile e do mesmo estagio de build: o nginx que serve
# estatico e faz proxy das APIs, e o Node que renderiza o HTML. O `--target` e
# obrigatorio nos dois — sem ele, o docker constroi o ultimo estagio do arquivo.

# O commit que entrou nesta imagem, para o ./imagens-em-dia.ps1 poder dizer se ela
# ficou para tras do codigo. Sem a marca, so da para comparar a data da imagem com a
# do ultimo commit -- que erra quando o relogio da maquina anda para tras e nao sabe
# de qual commit a imagem veio.
$revisao = git rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or -not $revisao) { $revisao = "desconhecida" }

docker build --label org.opencontainers.image.revision=$revisao --secret id=packages_token,env=PACKAGES_TOKEN --target web -t xcorpiiion/soulguide-front:latest .

if ($LASTEXITCODE -ne 0)
{
    Write-Host "ERRO: Docker build do front falhou!" -ForegroundColor Red
    exit 1
}

docker build --label org.opencontainers.image.revision=$revisao --secret id=packages_token,env=PACKAGES_TOKEN --target ssr -t xcorpiiion/soulguide-ssr:latest .

if ($LASTEXITCODE -ne 0)
{
    Write-Host "ERRO: Docker build do SSR falhou!" -ForegroundColor Red
    exit 1
}

Write-Host "soulguide-front e soulguide-ssr buildadas com sucesso!" -ForegroundColor Green
