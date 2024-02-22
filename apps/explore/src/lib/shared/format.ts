const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto'
})

type Division = {
  amount: number
  name: Intl.RelativeTimeFormatUnit
}

const divisions: Division[] = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' }
]

export function formatTimeAgo(dateStr?: string) {
  if (!dateStr) {
    return
  }

  const date = new Date(dateStr)

  // From https://blog.webdevsimplified.com/2020-07/relative-time-format/
  let duration = (date.getTime() - new Date().getTime()) / 1000
  for (let i = 0; i <= divisions.length; i++) {
    const division = divisions[i]
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name)
    }
    duration /= division.amount
  }
}
