# 🏋️ Cargas

Gerenciador de cargas de academia, privado e offline, que roda como PWA no iPhone e no computador. Sem frameworks, sem build e sem App Store: só HTML, CSS e JavaScript puro.

## Funcionalidades

- **Treinar:** escolha o grupo muscular do dia, veja os exercícios dele com a última carga em destaque e salve a nova com um toque.
- **Cadastrar:** adicione exercícios e associe cada um a um grupo (Peito, Costas, Pernas, Ombros, Braços, Abdomem).
- **Dashboard:** treinos por grupo muscular e gráfico de progressão de carga por exercício.
- **Offline:** funciona sem internet depois da primeira abertura.
- **Sincronização manual** entre aparelhos via JSONBin.io, só quando você tocar no botão.
- **Backup cifrado** em arquivo, sem precisar de nuvem.

## Segurança

- Todos os dados são cifrados no aparelho com AES-GCM. A chave vem da sua senha, via PBKDF2 (600 mil iterações) com sal aleatório.
- Na nuvem só vai texto cifrado. O JSONBin não consegue ler seus exercícios nem suas cargas.
- Não há chaves no código. A chave da API e o Bin ID são digitados no app e guardados dentro do cofre cifrado.
- O app bloqueia sozinho após 10 minutos parado ou em segundo plano.
- Política de segurança (CSP) restringe scripts ao próprio app e a rede ao `api.jsonbin.io`.
- **Não há recuperação de senha.** Se você esquecer, os dados são perdidos.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da interface e política de segurança |
| `app.js` | Lógica, criptografia, sincronização e gráficos |
| `style.css` | Tema escuro OLED |
| `sw.js` | Service Worker (cache offline) |
| `manifest.webmanifest` | Dados de instalação do PWA |
| `*.png` | Ícones do app |

## Como publicar

O PWA precisa de HTTPS. Duas opções simples:

- **GitHub Pages:** suba estes arquivos para um repositório e ative Pages em *Settings → Pages*.
- **Netlify Drop:** arraste a pasta em `app.netlify.com/drop`.

Como não há chaves no código nem dados em texto puro, publicar o código é seguro.

## Instalação no iPhone

1. Abra o endereço no Safari, com internet.
2. Toque em Compartilhar → **Adicionar à Tela de Início**.
3. Abra o app uma vez com internet para guardar o cache offline.
4. Na primeira abertura, crie a senha do cofre (mínimo de 10 caracteres).

## Sincronização entre aparelhos

1. Crie uma conta em [jsonbin.io](https://jsonbin.io/).
2. Crie um bin privado com conteúdo `{}` e copie o **Bin ID**.
3. Em *API Keys*, crie uma **Access Key** só com permissões de leitura e atualização de bins.
4. No app, abra ⚙️ **Ajustes → Nuvem**, cole a chave e o Bin ID e salve.
5. Toque em **Sincronizar Cargas com a Nuvem**.

Em um segundo aparelho, crie o cofre com a **mesma senha**, repita o passo 4 e sincronize. A mesclagem une o histórico por data e, no mesmo dia, vale o registro mais recente.

### Sem nuvem

Em ⚙️ Ajustes use **Exportar backup** (arquivo cifrado) e **Importar backup** no outro aparelho, por AirDrop ou pelo app Arquivos.

## Limitações

- Sem recuperação de senha e sem troca de senha.
- Duas sincronizações simultâneas: a última a enviar prevalece na nuvem. Nada se perde nos aparelhos, e a próxima sincronização refaz a mescla.
- O plano gratuito do JSONBin limita cada registro a 100 KB.
- Sem Face ID. O Chaveiro do iCloud pode preencher a senha.

## Desenvolvimento local

Abra a pasta com qualquer servidor estático, por exemplo `python3 -m http.server`, e acesse `http://localhost:8000`. O `localhost` conta como contexto seguro para a Web Crypto.
