export function checkCommand(command: string, message: string) {
  return `
if ! command -v ${command} &> /dev/null
then
  echo "Error: ${command} could not be found. ${message}"
  exit 1
fi`.trim()
}
