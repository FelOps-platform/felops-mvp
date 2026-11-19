import { expect, it } from 'vitest'
import { assertTransition } from '../src/actions/state'

it('does not allow a pending run to start without approval', () => {
  expect(() => assertTransition('pending', 'running')).toThrow()
})

it('allows an approved run to start once', () => {
  expect(() => assertTransition('approved', 'running')).not.toThrow()
})

it('does not allow a rejected run to execute', () => {
  expect(() => assertTransition('rejected', 'running')).toThrow()
})

it('allows a failed run to retry but not a succeeded one', () => {
  expect(() => assertTransition('failed', 'running')).not.toThrow()
  expect(() => assertTransition('succeeded', 'running')).toThrow()
})
