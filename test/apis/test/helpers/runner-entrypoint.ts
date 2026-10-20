import { runApis } from '@allmaps/tools-apis'
import { safeError } from '@allmaps/tools-setup'

try {
  await runApis(JSON.parse(process.env.ALLMAPS_API_TEST_CONFIGURATION!))
} catch (error) {
  console.error(safeError(error))
  process.exitCode = 1
}
