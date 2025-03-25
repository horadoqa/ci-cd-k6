# ci-cd-k6
Criando um processo de CI/CD com teste utilizando o k6

Para criar um processo de CI/CD no GitHub utilizando o k6, comparando os resultados de teste com um baseline e enviando uma notificação por e-mail em caso de falha nos critérios (menor número de requests ou maior tempo de resposta), você pode seguir os seguintes passos.

## Passo 1: Preparar o Script de Teste com k6

Crie um script de teste em k6 que defina os testes de desempenho. O script pode ser algo como:

**`test.js`**:
```javascript
import { check, group, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  vus: 10,  // Número de usuários virtuais
  duration: '30s',  // Duração do teste
};

export default function () {
  group('Testando HOME', function () {
    const res = http.get('https://www.globo.com');

    // Verificando se o status da resposta é 200
    check(res, {
      'status é 200': (r) => r.status === 200,
    });

    sleep(1);
  });
}
```

## Passo 2: Criar o Workflow no GitHub Actions

Agora, crie um workflow no GitHub Actions para rodar o teste com k6. O workflow irá rodar o script, coletar as métricas e comparar com o baseline.

Crie o arquivo de workflow no diretório `.github/workflows/ci.yml`.

**`.github/workflows/ci.yml`**:

```yaml
name: CI with k6

on:
  push:
    branches:
      - main  # Ou outra branch de sua preferência

jobs:
  k6-tests:
    runs-on: ubuntu-latest
    
    steps:
      # Checkout do código
      - name: Check out repository
        uses: actions/checkout@v2

      # Instalar k6
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      # Instalar jq (caso não esteja disponível)
      - name: Install jq
        run: sudo apt-get install jq

      # Instalar mailutils para envio de e-mails
      - name: Install mail client
        run: sudo apt-get install mailutils

      # Rodar os testes com k6
      - name: Run k6 load test
        id: k6-test
        run: |
          k6 run test.js --out json=results.json --summary-export=summary.json  # Adicionando o summary-export para gerar o summary.json

      # Comparar os resultados com o baseline e enviar e-mail em caso de falha
      - name: Compare with baseline and send email if failed
        run: |
          BASELINE_REQUESTS=200  # Número esperado de requests
          BASELINE_AVG_RESPONSE_TIME=1000  # Tempo médio de resposta esperado (em ms)
          BASELINE_RQPS=10  # Exemplo de baseline de requests por segundo

          # Obter os dados consolidados do summary.json
          TOTAL_REQUESTS=$(jq '.metrics.http_reqs.count' summary.json)
          AVG_RESPONSE_TIME=$(jq '.metrics.http_req_duration.avg' summary.json)
          RQPS=$(jq '.metrics.http_reqs.rate' summary.json)
          ERROR_RATE=$(jq '.metrics.http_req_failed.passes' summary.json)

          # Inicializar uma variável de mensagem de erro
          ERROR_MESSAGE="Falha nos testes de desempenho! Resultados abaixo do esperado:"

          # Comparar os valores e adicionar a falha correspondente à mensagem de erro
          if [ "$TOTAL_REQUESTS" -lt "$BASELINE_REQUESTS" ]; then
            ERROR_MESSAGE="$ERROR_MESSAGE\n- Número de requests abaixo do esperado: Esperado >= $BASELINE_REQUESTS, Obtido: $TOTAL_REQUESTS"
            echo $ERROR_MESSAGE
          fi

          if [ "$(echo "$AVG_RESPONSE_TIME > $BASELINE_AVG_RESPONSE_TIME" | bc -l)" -eq 1 ]; then
            ERROR_MESSAGE="$ERROR_MESSAGE\n- Tempo médio de resposta acima do esperado: Esperado <= $BASELINE_AVG_RESPONSE_TIME, Obtido: $AVG_RESPONSE_TIME"
            echo $ERROR_MESSAGE
          fi

          if [ "$(echo "$RQPS < $BASELINE_RQPS" | bc -l)" -eq 1 ]; then
            ERROR_MESSAGE="$ERROR_MESSAGE\n- Requests por segundo abaixo do esperado: Esperado >= $BASELINE_RQPS, Obtido: $RQPS"
            echo $ERROR_MESSAGE
          fi

          if [ "$(echo "$ERROR_RATE > 0" | bc -l)" -eq 1 ]; then
            ERROR_MESSAGE="$ERROR_MESSAGE\n- Taxa de erro acima do esperado: Esperado = 0, Obtido: $ERROR_RATE"
            echo $ERROR_MESSAGE
          fi

          # # Verificar se algum parâmetro falhou e enviar o e-mail
          # if [ -n "$ERROR_MESSAGE" ]; then
          #   echo -e "$ERROR_MESSAGE" | \
          #     mail -s "Alerta de Teste de Desempenho" -S smtp="smtp://$SMTP_SERVER:$SMTP_PORT" \
          #     -S smtp-auth=login -S smtp-auth-user=$SMTP_USER -S smtp-auth-password=$SMTP_PASS \
          #     seu-email@dominio.com
          #   exit 1
          # else
          #   echo "Teste de desempenho aprovado!"
          # fi
```

## Passo 3: Configurar o Envio de E-mail

Você pode usar o `mail` ou `sendmail` no GitHub Actions para enviar um e-mail. O método mais simples é usar um serviço de e-mail SMTP.

#### Usando `mail` com SMTP

Adicione variáveis de ambiente para o envio de e-mails no GitHub Secrets, como:

- `SMTP_SERVER`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Adapte o script do passo 2 para enviar um e-mail usando essas variáveis:

```bash
# Verificar se algum parâmetro falhou e enviar o e-mail
  if [ -n "$ERROR_MESSAGE" ]; then
    echo -e "$ERROR_MESSAGE" | \
      mail -s "Alerta de Teste de Desempenho" -S smtp="smtp://$SMTP_SERVER:$SMTP_PORT" \
      -S smtp-auth=login -S smtp-auth-user=$SMTP_USER -S smtp-auth-password=$SMTP_PASS \
      seu-email@dominio.com
    exit 1
   else
     echo "Teste de desempenho aprovado!"
  fi
```

> **Nota**: A utilização de `mail` ou `sendmail` com SMTP no GitHub Actions pode necessitar de permissões ou dependências adicionais. Outra alternativa seria usar uma ferramenta como [SendGrid](https://sendgrid.com/) ou [Mailgun](https://www.mailgun.com/), que oferecem APIs fáceis de integrar.

## Passo 4: Testar o Workflow

Depois de configurar o arquivo de workflow e garantir que o script de testes esteja correto, faça um push para a sua branch `main` (ou a branch configurada no workflow) e verifique os resultados. O GitHub Actions rodará o teste com k6, comparará os resultados com o baseline e enviará um e-mail caso os critérios sejam violados.

## Conclusão

Com essa configuração, você terá um processo de CI/CD com k6 que roda os testes de desempenho, compara os resultados com um baseline e envia uma notificação por e-mail caso haja falhas no desempenho.
