export function sourceToInlineMdc(url: string): string {
  const domain = getDomain(url)
  const favicon = getFaviconUrl(url)
  const safeUrl = url.replace(/"/g, '&quot;')
  const safeFavicon = favicon.replace(/"/g, '&quot;')

  return ` :source-link{url="${safeUrl}" favicon="${safeFavicon}" label="${domain}"}`
}
