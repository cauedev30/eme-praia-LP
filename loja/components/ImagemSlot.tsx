// Espaco reservado pra foto que ainda nao existe. Aparece no lugar do <img>
// quando o produto ou a categoria esta sem imagem — inclusive depois, quando a
// Mayara cadastrar uma peca e so subir a foto mais tarde.
export default function ImagemSlot({
  rotulo,
  tom = 'claro',
}: {
  rotulo?: string
  tom?: 'claro' | 'escuro'
}) {
  const cores =
    tom === 'escuro'
      ? 'border-white/25 bg-white/[0.03] text-white/50'
      : 'border-carvao/20 bg-areia text-carvao/40'

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 border border-dashed ${cores}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" className="h-7 w-7">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5-6 6-3-3-4 4" strokeLinejoin="round" />
      </svg>
      {rotulo && (
        <span className="px-3 text-center text-[10px] uppercase leading-tight tracking-widest">
          {rotulo}
        </span>
      )}
    </div>
  )
}
