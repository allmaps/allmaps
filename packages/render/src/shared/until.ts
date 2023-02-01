// From:
//   https://blog.openreplay.com/forever-functional-waiting-with-promises/

export function until(fn: () => boolean, time = 50, wait = 10000): Promise<boolean> {
  const startTime = new Date().getTime()
  try {
    if (fn()) {
      return Promise.resolve(true)
    } else {
      return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
          try {
            if (fn()) {
              clearInterval(timer)
              resolve(true)
            } else if (new Date().getTime() - startTime > wait) {
              clearInterval(timer)
              reject(new Error('Max wait reached'))
            }
          } catch (err) {
            clearInterval(timer)
            reject(err)
          }
        }, time)
      })
    }
  } catch (err) {
    return Promise.reject(err)
  }
}
