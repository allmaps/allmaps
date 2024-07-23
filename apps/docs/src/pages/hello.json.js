// Outputs:
export async function GET({ params, request }) {
  // This may need to be tested to make sure this path actually works
  // const res = await fetch(`../content/docs/code-snippets/${params.file}.js`)\
  const codeString =
    "console.log('fetched this live!')\nconsole.log()\nfor(int i = 0; i++; i <20) { \n console.log('hi')\n}"
  console.log(codeString)
  return new Response(
    JSON.stringify({
      code: "console.log('fetched this live!')\nconsole.log()\nfor(int i = 0; i++; i <20) { \n console.log('hi')\n}"
    })
  )
}
