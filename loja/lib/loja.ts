import { loja } from '@/loja.config'

export const WHATSAPP_NUMERO = loja.whatsapp
export const INSTAGRAM_URL = loja.instagram

export function linkWhatsApp(mensagem?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMERO}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}

export function urlAbsoluta(caminho: string) {
  return new URL(caminho, loja.dominio).toString()
}
