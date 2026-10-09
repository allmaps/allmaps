import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requestLayout } from '../src/lib/layout-client.ts'
import type { LayoutReply } from '../src/lib/layout-task.ts'

function fakeWorker() {
  return {
    onmessage: null as ((event: { data: LayoutReply }) => void) | null,
    onerror: null as (() => void) | null,
    onmessageerror: null as (() => void) | null,
    terminated: false,
    sent: false,
    postMessage() {
      this.sent = true
    },
    terminate() {
      this.terminated = true
    }
  }
}
const request = {
  type: 'add' as const,
  input: {},
  at: [0, 0] as [number, number]
}
test('successful layout replies terminate the worker', async () => {
  const worker = fakeWorker()
  const result = { items: [], fallback: false }
  const pending = requestLayout(
    worker as unknown as Worker,
    request,
    new AbortController().signal
  )
  worker.onmessage!({ data: { result } })
  assert.deepEqual(await pending, result)
  assert.equal(worker.terminated, true)
  assert.equal(worker.onmessage, null)
})
test('cancellation terminates computation and ignores an already queued reply', async () => {
  const worker = fakeWorker(),
    controller = new AbortController()
  const pending = requestLayout(
    worker as unknown as Worker,
    request,
    controller.signal
  )
  const lateReply = worker.onmessage!
  controller.abort()
  lateReply({ data: { result: { items: [], fallback: false } } })
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(worker.terminated, true)
})
test('an already cancelled request does not start computation', async () => {
  const worker = fakeWorker(),
    controller = new AbortController()
  controller.abort()
  await assert.rejects(
    requestLayout(worker as unknown as Worker, request, controller.signal),
    { name: 'AbortError' }
  )
  assert.equal(worker.sent, false)
  assert.equal(worker.terminated, true)
})
test('worker errors preserve their message and release the worker', async () => {
  const worker = fakeWorker()
  const pending = requestLayout(
    worker as unknown as Worker,
    request,
    new AbortController().signal
  )
  worker.onmessage!({ data: { error: 'Invalid map' } })
  await assert.rejects(pending, /Invalid map/)
  assert.equal(worker.terminated, true)
})

test('a stalled worker is terminated at the deadline', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const worker = fakeWorker()
  const pending = requestLayout(
    worker as unknown as Worker,
    request,
    new AbortController().signal
  )
  context.mock.timers.tick(30000)
  await assert.rejects(pending, /timed out/)
  assert.equal(worker.terminated, true)
})
