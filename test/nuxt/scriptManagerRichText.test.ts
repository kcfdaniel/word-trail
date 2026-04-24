import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { plainTextToHtml } from '../../app/utils/richText'

describe('useScriptManager rich text defaults', () => {
  it('creates scripts as rich text by default with generated HTML', async () => {
    const TestComponent = defineComponent({
      setup() {
        const { createScript } = useScriptManager()
        const script = createScript('Title', plainTextToHtml('Hello world'))
        return () => h('div', { innerHTML: script.contentHtml })
      },
    })

    const wrapper = await mountSuspended(TestComponent)
    expect(wrapper.html()).toContain('<p>Hello world</p>')
  })

  it('persists created scripts to localStorage', async () => {
    localStorage.removeItem('wordtrail-scripts')
    localStorage.removeItem('wordtrail-current-script')

    const TestComponent = defineComponent({
      setup() {
        const { createScript } = useScriptManager()
        createScript('Saved Title', plainTextToHtml('Saved body'))
        return () => h('div')
      },
    })

    await mountSuspended(TestComponent)

    const storedScripts = localStorage.getItem('wordtrail-scripts')
    expect(storedScripts).toBeTruthy()
    expect(storedScripts).toContain('Saved Title')
    expect(storedScripts).toContain('<p>Saved body</p>')
  })
})
