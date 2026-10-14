export const DEFAULT_WHATSAPP_NUMBER = '+249901522299'
export const DISPLAY_WHATSAPP_NUMBER = '+249 901522299'

export function getWhatsAppNumber(): string {
  const rawNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
  return rawNumber.replace(/[^0-9]/g, '')
}

export function getWhatsAppUrl(messageText: string = 'مرحباً، أرغب في التسجيل في المنصة'): string {
  const number = getWhatsAppNumber()
  const encodedText = encodeURIComponent(messageText)
  return `https://wa.me/${number}?text=${encodedText}`
}

export const WHATSAPP_REGISTER_URL = getWhatsAppUrl('مرحباً، أرغب في التسجيل في المنصة')
export const WHATSAPP_SUPPORT_URL = getWhatsAppUrl('مرحباً، لدي استفسار بخصوص المنصة')
