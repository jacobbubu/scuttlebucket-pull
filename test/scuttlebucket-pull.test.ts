import { Model, ReliableEvent, link } from '@jacobbubu/scuttlebutt-pull'
import { Scuttlebucket } from '../src/'
import { delay } from './utils'

describe('Scuttlebucket', () => {
  const expected = {
    key: 'foo',
    value: 'bar',
    value2: 'bar2'
  }

  function create() {
    return new Scuttlebucket().add('meta', new Model()).add('event', new ReliableEvent())
  }

  it('bucket with model', async () => {
    const bucketA = create()
    const bucketB = create()

    const metaAtA: Model = bucketA.get('meta') as Model
    const metaAtB: Model = bucketB.get('meta') as Model

    expect(bucketA.get('meta').id).toBe(bucketA.id)
    expect(bucketA.get('event').id).toBe(bucketA.id)

    expect(bucketB.get('meta').id).toBe(bucketB.id)
    expect(bucketB.get('event').id).toBe(bucketB.id)

    metaAtA.set(expected.key, expected.value)

    const s1 = bucketA.createStream()
    const s2 = bucketB.createStream()

    link(s1, s2)

    await delay(10)

    expect(metaAtB.get(expected.key)).toBe(expected.value)
  })

  it('bucket with event', async () => {
    const bucketA = create()
    const bucketB = create()

    const eventAtA: ReliableEvent = bucketA.get('event') as ReliableEvent
    const eventAtB: ReliableEvent = bucketB.get('event') as ReliableEvent

    const s1 = bucketA.createStream()
    const s2 = bucketB.createStream()

    const aFired = jest.fn()
    const bFired = jest.fn()

    eventAtA.on('a', aFired)
    eventAtB.on('a', bFired)

    eventAtA.push('a', 'fired!')
    eventAtA.push('a', 'fired2!')
    eventAtB.push('a', 'fired3!')

    link(s1, s2)

    await delay(200)

    expect(aFired).toHaveBeenCalledTimes(3)
    expect(bFired).toHaveBeenCalledTimes(3)

    expect(aFired).toHaveBeenNthCalledWith(1, 'fired!')
    expect(aFired).toHaveBeenNthCalledWith(2, 'fired2!')
    expect(aFired).toHaveBeenNthCalledWith(3, 'fired3!')

    expect(bFired).toHaveBeenNthCalledWith(1, 'fired3!')
    expect(bFired).toHaveBeenNthCalledWith(2, 'fired!')
    expect(bFired).toHaveBeenNthCalledWith(3, 'fired2!')
  })

  it('setId', () => {
    const bucketA = create()
    bucketA.setId('newId')

    expect(bucketA.id).toBe('newId')
    expect(bucketA.get('meta').id).toBe(bucketA.id)
    expect(bucketA.get('event').id).toBe(bucketA.id)
  })

  it('toJSON', () => {
    const bucketA = create()
    const metaAtA: Model = bucketA.get('meta') as Model
    metaAtA.set(expected.key, expected.value)

    const j = bucketA.toJSON()
    expect(j.meta).toEqual(metaAtA.toJSON())
    expect(j.event).toBeUndefined()
  })

  it('_remove', async () => {
    const bucketA = create()
    const bucketB = create()

    const metaAtA: Model = bucketA.get('meta') as Model
    const metaAtB: Model = bucketB.get('meta') as Model

    const s1 = bucketA.createStream()
    const s2 = bucketB.createStream()

    const aFired = jest.fn()
    const bFired = jest.fn()

    bucketA.on('_remove', aFired)
    bucketB.on('_remove', bFired)

    link(s1, s2)

    metaAtA.set(expected.key, expected.value)
    metaAtB.set(expected.key, expected.value2)

    await delay(10)

    expect(aFired).toHaveBeenCalledTimes(1)
    expect(bFired).toHaveBeenCalledTimes(1)
  })
})
