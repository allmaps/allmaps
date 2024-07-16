<script lang="ts">
  import { ExpressiveCode } from 'expressive-code'
  import { toHtml } from 'expressive-code/hast'

  export let code

  let ec: ExpressiveCode = new ExpressiveCode()
  let baseStyles: string = ''
  let stylesToPrepend: string[] = ['']
  let styledHtmlContent: string = ''

  $: {
    // console.log(code)
    renderCode()
  }

  const renderCode = async () => {
    console.log('in render code')
    if (!code) return
    baseStyles = await ec.getBaseStyles()
    const { renderedGroupAst, styles } = await ec.render({
      code: code,
      language: 'json',
      meta: ''
    })
    stylesToPrepend.push(baseStyles)
    stylesToPrepend.push(...styles)
    // console.log(baseStyles)
    styledHtmlContent = `${toHtml(renderedGroupAst)}`
    // console.log(styledHtmlContent)
  }
</script>

{@html styledHtmlContent}
<div
  class="p-3 bg-gray-100 border-gray-400 border h-full font-mono overflow-y-auto break-all"
></div>
