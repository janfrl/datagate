export function sanitizeText(value: string) {
  return value
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[redacted-email]')
    .replace(/\b(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g, '[redacted-ip]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, (match) => {
      const digitCount = match.replace(/\D/g, '').length

      return digitCount >= 10 && digitCount <= 15 ? '[redacted-phone]' : match
    })
}
