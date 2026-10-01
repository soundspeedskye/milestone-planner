import { describe, expect, it } from 'vitest'
import { moveAtInsertionPoint } from './usePlannerStore'

describe('moveAtInsertionPoint', () => {
  const tasks = ['A', 'B', 'C', 'D']

  it('inserts a card before the target when dragged downward', () => {
    expect(moveAtInsertionPoint(tasks, 0, 2)).toEqual(['B', 'A', 'C', 'D'])
  })

  it('inserts a card after the target when dragged downward', () => {
    expect(moveAtInsertionPoint(tasks, 0, 3)).toEqual(['B', 'C', 'A', 'D'])
  })

  it('supports the first and last insertion boundaries', () => {
    expect(moveAtInsertionPoint(tasks, 3, 0)).toEqual(['D', 'A', 'B', 'C'])
    expect(moveAtInsertionPoint(tasks, 0, 4)).toEqual(['B', 'C', 'D', 'A'])
  })
})
