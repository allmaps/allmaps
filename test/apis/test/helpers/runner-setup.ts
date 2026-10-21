import {
  installIsolation,
  allowTestPort,
  assertRunnerConfiguration
} from './isolation.ts'

const directory = process.env.ALLMAPS_API_TEST_ROOT
if (!directory) throw new Error('Missing temporary API test directory')
installIsolation(directory)
for (const port of JSON.parse(process.env.ALLMAPS_API_TEST_PORTS ?? '[]'))
  allowTestPort(port)
assertRunnerConfiguration(
  JSON.parse(process.env.ALLMAPS_API_TEST_CONFIGURATION ?? '{}')
)
