-- Catalogo da Eme Praia. Espelha loja/lib/tipos.ts.
-- Booleanos sao INTEGER 0/1 (SQLite nao tem boolean). Precos em centavos.

CREATE TABLE categorias (
  id     TEXT PRIMARY KEY,
  slug   TEXT NOT NULL UNIQUE,
  nome   TEXT NOT NULL,
  imagem TEXT NOT NULL DEFAULT '',
  ordem  INTEGER NOT NULL,
  ativo  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE produtos (
  id                 TEXT PRIMARY KEY,
  -- Congelado na criacao (decisao 5). Nunca segue o nome.
  slug               TEXT NOT NULL UNIQUE,
  nome               TEXT NOT NULL,
  descricao          TEXT NOT NULL DEFAULT '',
  categoria_id       TEXT NOT NULL REFERENCES categorias(id),
  preco_centavos     INTEGER NOT NULL,
  preco_pix_centavos INTEGER NOT NULL,
  -- JSON: string[]. A Fase 3 grava a lista inteira de uma vez.
  imagens            TEXT NOT NULL DEFAULT '[]',
  tem_kids           INTEGER NOT NULL DEFAULT 0,
  ordem              INTEGER NOT NULL,
  -- Nada e excluido, tudo e arquivado (decisao 6).
  ativo              INTEGER NOT NULL DEFAULT 1,
  atualizado_em      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Grade adulto, por produto (decisao 8). Uma linha por tamanho: o toque da
-- Mayara no painel e um UPDATE de uma linha, sem reescrever o produto.
-- Kids nao entra aqui: e variante fixa da loja e nunca esgota.
CREATE TABLE tamanhos (
  produto_id TEXT NOT NULL REFERENCES produtos(id),
  tamanho    TEXT NOT NULL,
  ordem      INTEGER NOT NULL,
  disponivel INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (produto_id, tamanho)
);
