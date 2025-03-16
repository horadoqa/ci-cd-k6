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
