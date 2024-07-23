<script lang="ts">
  import { codeToHtml } from 'shiki'
  export let code: string
  export let lang: string = 'javascript'
  let stylizedCode: string

  const updateCodeStyle = async () => {
    stylizedCode = await codeToHtml(code, {
      lang: lang,
      theme: 'nord'
    })
  }
  $: {
    updateCodeStyle()
  }
  updateCodeStyle()
</script>

<div class="">
  {@html stylizedCode}
</div>
