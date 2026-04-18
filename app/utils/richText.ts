export const htmlToPlainText = (html: string): string => {
  if (!import.meta.client) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export const plainTextToHtml = (text: string): string => {
  return text
    .split('\n\n')
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
