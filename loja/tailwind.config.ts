import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Paleta da Eme Praia, tirada do selo: laranja de preenchimento com o
      // grafite recortado por dentro. Duas cores, alto contraste, sem meio
      // termo. Nada aqui e herdado da i love bikini — o creme/areia/bronze
      // de la era bege sobre bege e apagava o laranja da marca.
      //
      // A regra que segura a paleta: **laranja preenche, terra escreve.**
      // Laranja so vira tinta sobre fundo escuro (6,4:1 no breu); sobre fundo
      // claro ele da 2,5:1 e some, entao ali quem escreve e o terra.
      colors: {
        laranja: '#FB7F20', // laranja do selo — CTA, badge, preenchimento
        terra: '#B35207',   // laranja escurecido — tinta em fundo claro (4,88:1)
        grafite: '#323233', // grafite do selo — texto, borda, fundo escuro
        breu: '#1F1F20',    // grafite mais fundo — secao escura de campanha
        gelo: '#FAFAFA',    // fundo principal
        concha: '#E7E6E2',  // fundo alternativo — rodape, cards, slot de foto
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-jost)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
