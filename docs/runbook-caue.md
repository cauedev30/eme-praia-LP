# Runbook — Cauê

Escrito pro Cauê de daqui a oito meses, que não vai lembrar de nada.

## Regras do repositório

- **Commits saem exclusivamente da conta `cauefranco01@gmail.com`.**
  Já configurado localmente. Conferir com `git config user.email`.
- **Nada do MazyOS entra aqui.** Este repositório fica dentro de
  `eme praia/clientes/eme-praia/`, mas é um repo git independente — o
  `.gitignore` do MazyOS ignora a pasta inteira. Antes de commitar, conferir
  onde você está com `git rev-parse --show-toplevel`.

## Estado atual

**Fase 0 concluída.** O site é estático, o catálogo está correto no formato
final, mas ainda mora em arquivo (`loja/data/`). Nada de banco ainda.

Próximo: Fase 1 (D1 + seed + `/api/catalogo.json`).

## Pendências antes do lançamento

- [ ] `loja.config.ts`: WhatsApp, Instagram e domínio reais da Mayara
- [ ] `loja.config.ts`: confirmar com a Mayara a grade kids (`gradeKids`,
      hoje 4/6/8/10/12) e se toda peça sai em kids (senão, desligar
      `temKids` nas que não saem)
- [ ] **Texto repetido**: "Seu verão começa aqui." está no hero e também
      no FeatureBanner do meio da home. Decidir qual dos dois muda.
- [x] Logo da Eme Praia — os dois arquivos vêm de `imagens/logos/` sem
      alteração de arte: `eme-logo.webp` (o selo completo, com o anel
      de escrita) no topo, 80px no celular e 112px no desktop; e
      `eme-lettering.webp` no rodapé. Ícone da aba: `app/icon.png`,
      o mesmo selo em 512px quantizado em 32 cores (26 KB).
      O coração do i love bikini saiu junto com o `HeartMark.tsx`.
- [x] Hero: `public/hero/hero-1.webp` (foto da Mayara, 2077 KB -> 102 KB).
      A foto é 1,88:1. No celular a caixa é 55svh com foco em `10% 50%`
      (centralizado corta as peças e sobra só a barriga). No desktop a
      seção usa `aspect-[1721/914]`, a proporção da própria foto, então
      não há corte — se mexer na altura, o corte volta.
      A frase "Seu verão começa aqui." + botão "Confira Coleção" fica no
      canto inferior direito. O véu de dois gradientes não é enfeite: a
      foto é de sol a pino e sem ele o branco fica em 1,3:1 ali. Com ele,
      5,3:1 na mediana. Se trocar a foto do hero, remedir.
- [ ] **Todas as fotos de catálogo** — `public/` hoje tem só a hero-1 e os
      dois logos. Nenhuma imagem do i love bikini ficou no repo.
      Sem foto, o `ImagemSlot` desenha um retângulo tracejado no lugar:
      2 categorias, 17 produtos e o banner do meio da home.
      Falta: fotos de produto, capa das 2 categorias e foto do banner.
- [ ] Catálogo real — os 17 produtos atuais são fixtures herdados
- [x] Paleta (`tailwind.config.ts`) — creme/areia/bronze/carvao/noturno saíram.
      A paleta agora é só a marca: `laranja`+`grafite` do selo, mais `terra`
      (laranja escurecido pra virar tinta), `breu`, `gelo` e `concha`.
      A regra que segura ela está na decisão 12. Se for mexer, remedir contraste.
- [ ] Fontes (`tailwind.config.ts`) — Fraunces/Jost ainda são herdadas da
      i love bikini; nunca foram conferidas contra a marca da Eme
- [ ] Domínio registrado **no nome da Mayara** no Registro.br, DNS na Cloudflare

## Verificações que valem repetir a cada mudança grande

```bash
cd loja && npm test && npm run build
```

Depois, sobre `loja/out/`:

- Cada produto tem `<title>` próprio (sem isso a loja some do Google)
- Produto com `ativo: false` **não** gera HTML, sai do sitemap e sai da home
- Tamanho com `disponivel: false` sai riscado e com o botão desabilitado
- `sitemap.xml` e `robots.txt` existem e apontam pro domínio certo
- Produto com adulto todo esgotado e `temKids: true` **não** aparece como
  esgotado; a fileira "Linha kids" continua clicável

## Quando algo quebrar

- **Build falhando** — é o comportamento certo se a API estiver fora. O deploy
  anterior continua no ar. Nunca fazer o build publicar catálogo vazio.
- **Produto novo não apareceu** — provavelmente não passou na validação. Olhar o
  log do build; produto inválido é pulado de propósito, pra não derrubar a loja.
