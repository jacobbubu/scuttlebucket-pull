import { Scuttlebutt, Update, UpdateItems, Sources } from '@jacobbubu/scuttlebutt-pull'
import { Debug } from '@jacobbubu/debug'

export enum ScuttlebucketValueItems {
  Name = 0,
  OriginalValue
}

function setId(obj: Scuttlebutt, id: string) {
  obj.setId(id)
  return obj
}

function runToJSON(obj: any) {
  return 'function' === typeof obj.toJSON ? obj.toJSON() : undefined
}

export class Scuttlebucket extends Scuttlebutt {
  private _doEmit = true
  private _parts: Record<string, Scuttlebutt> = {}

  public logger: Debug = Debug.create('sbb')

  setId(id: string) {
    this.id = id
    for (let name in this._parts) {
      setId(this._parts[name], id)
    }
    return this
  }

  _wrap(name: string, update: Update) {
    const value = update[UpdateItems.Data]
    const newUpdate: Update = [...update] as Update
    newUpdate[UpdateItems.Data] = [name, value]
    return newUpdate
  }

  get(name: string) {
    return this._parts[name]
  }

  add(name: string, obj: Scuttlebutt) {
    this._parts[name] = obj
    const self = this

    obj.on('_update', function(update: Update) {
      if (!self._doEmit) {
        return
      }

      self.emit('_update', self._wrap(name, update))
    })

    obj.on('_remove', function(update) {
      const rm = self._wrap(name, update)
      self.emit('_remove', rm)
    })

    // all sub components are from the same machine and will share the same timestamps.
    // that is, the timestamps should be strictly monotonically increasing.
    setId(obj, this.id)
    return this
  }

  applyUpdate(update: Update) {
    const newUpdate = [...update] as Update

    const value = newUpdate[UpdateItems.Data].slice()
    if (value.length !== 2) {
      this.logger.error('INVALID', update)
      return false
    }
    const name = value[ScuttlebucketValueItems.Name]
    newUpdate[UpdateItems.Data] = value[ScuttlebucketValueItems.OriginalValue]

    // wrap in try-finally so to prevent corruption when an event listener throws.
    this._doEmit = false
    try {
      this._parts[name]._update(JSON.parse(JSON.stringify(newUpdate)))
    } finally {
      this._doEmit = true
    }
    return true
  }

  history(sources: Sources) {
    const h: Update[] = []
    const self = this
    for (let name in this._parts) {
      this._parts[name].history(sources).forEach(function(update: Update) {
        h.push(self._wrap(name, update))
      })
    }
    return h.sort(function(a, b) {
      return (
        a[UpdateItems.Timestamp] - b[UpdateItems.Timestamp] ||
        (a[UpdateItems.SourceId] === b[UpdateItems.SourceId]
          ? 0
          : a[UpdateItems.SourceId] < b[UpdateItems.SourceId]
          ? -1
          : 1)
      )
    })
  }

  toJSON() {
    const j: Record<string, any> = {}
    for (let key in this._parts) {
      j[key] = runToJSON(this._parts[key])
    }
    return j
  }
}
