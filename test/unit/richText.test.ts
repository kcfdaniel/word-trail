import { describe, expect, it } from 'vitest'
import { plainTextToHtml } from '../../app/utils/richText'

describe('plainTextToHtml', () => {
  it('wraps paragraphs and converts newlines to <br>', () => {
    const html = plainTextToHtml('Hello\nworld\n\nSecond para')
    expect(html).toBe('<p>Hello<br>world</p><p>Second para</p>')
  })
})
