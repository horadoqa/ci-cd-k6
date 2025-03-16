# ci-cd-k6
Criando um processo de CI/CD com teste utilizando o k6

Para criar um processo de CI/CD no GitHub utilizando o k6, comparando os resultados de teste com um baseline e enviando uma notificação por e-mail em caso de falha nos critérios (menor número de requests ou maior tempo de resposta), você pode seguir os seguintes passos.

### Passo 1: Preparar o Script de Teste com k6

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

### Passo 2: Criar o Workflow no GitHub Actions

Agora, crie um workflow no GitHub Actions para rodar o teste com k6. O workflow irá rodar o script, coletar as métricas e comparar com o baseline.

Crie o arquivo de workflow no diretório `.github/workflows/ci.yml`.

**`.github/workflows/ci.yml`**:

### Passo 3: Configurar o Envio de E-mail

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

### Passo 4: Testar o Workflow

Depois de configurar o arquivo de workflow e garantir que o script de testes esteja correto, faça um push para a sua branch `main` (ou a branch configurada no workflow) e verifique os resultados. O GitHub Actions rodará o teste com k6, comparará os resultados com o baseline e enviará um e-mail caso os critérios sejam violados.

### Conclusão

Com essa configuração, você terá um processo de CI/CD com k6 que roda os testes de desempenho, compara os resultados com um baseline e envia uma notificação por e-mail caso haja falhas no desempenho.
