import { describe, expect, it } from 'vitest'
import { admits, pitchAt } from './feedback'

describe('cue priority', () => {
  const held = { rank: 3, until: 1150 }

  it('lets a more important cue cut in', () => {
    expect(admits(held, 4, 1100)).toBe(true)
  })

  it('drops an equal or lesser cue while the last one is held', () => {
    expect(admits(held, 3, 1100)).toBe(false)
    expect(admits(held, 0, 1100)).toBe(false)
  })

  it('plays anything once the hold has passed, or when nothing has played', () => {
    expect(admits(held, 0, 1150)).toBe(true)
    expect(admits(null, 0, 0)).toBe(true)
  })
})

describe('slider pitch', () => {
  it('rises by a fifth across the whole track', () => {
    expect(pitchAt(0)).toBe(1)
    expect(pitchAt(1)).toBeCloseTo(2 ** (7 / 12))
    expect(pitchAt(0.5)).toBeGreaterThan(pitchAt(0.25))
  })

  it('stays within the track for values outside it', () => {
    expect(pitchAt(-0.5)).toBe(pitchAt(0))
    expect(pitchAt(1.5)).toBe(pitchAt(1))
  })
})
