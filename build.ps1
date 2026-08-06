Write-Host "Buildando soulguide-front..." -ForegroundColor Cyan

# O build instala @xcorpiiion/canonico do GitHub Packages, que exige token com
# escopo read:packages. Falhar aqui é melhor que falhar dentro do docker build
# com um 401 sem contexto.
if (-not $env:GITHUB_TOKEN)
{
    Write-Host "ERRO: variavel GITHUB_TOKEN nao definida." -ForegroundColor Red
    Write-Host "      O front depende de @xcorpiiion/canonico (GitHub Packages)." -ForegroundColor Yellow
    Write-Host '      Defina com: $env:GITHUB_TOKEN = "<seu-PAT-com-read:packages>"' -ForegroundColor Yellow
    exit 1
}

docker build --secret id=github_token,env=GITHUB_TOKEN -t xcorpiiion/soulguide-front:latest .

if ($LASTEXITCODE -ne 0)
{
    Write-Host "ERRO: Docker build falhou!" -ForegroundColor Red
    exit 1
}

Write-Host "soulguide-front buildada com sucesso!" -ForegroundColor Green
