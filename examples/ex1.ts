import { Scuttlebucket } from '../src'
import { Model, ReliableEvent, link } from '@jacobbubu/scuttlebutt-pull'
import { delay } from './utils'

function create() {
  return new Scuttlebucket().add('meta', new Model()).add('event', new ReliableEvent())
}

async function main() {
  const a = create()
  const b = create()

  const s1 = a.createStream({ name: 'a->b' })
  const s2 = b.createStream({ name: 'b->a' })

  link(s1, s2)

  const metaModelAtA = a.get('meta') as Model
  metaModelAtA.set('version', '0.1.0')

  await delay(10)

  const metaModelAtB = b.get('meta') as Model
  console.log({ version: metaModelAtB.get('version') })
}

// tslint:disable-next-line no-floating-promises
main()
