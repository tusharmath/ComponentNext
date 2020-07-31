import { Lens, LensFromPath } from 'monocle-ts'

interface Command {}

const EMPTY: Command = {}

enum ListTag {
  Empty,
  Value
}
type Empty = { tag: ListTag.Empty }
const Empty: Empty = { tag: ListTag.Empty }
type Value<A> = { tag: ListTag.Value; head: A; tail: List<A> }
type List<A> = Empty | Value<A>

type Action<T extends string | number, V> = {
  type: T
  value: V
}

declare function h(name: string, children: unknown[]): string

class Component<S = unknown, A = never, V = never> {
  constructor(
    private _state: S,
    private _listU: List<(A: A, S: S) => S>,
    private _listC: List<(A: A, S: S) => Command>,
    private _view: (S: S) => V
  ) {}

  public update(A: A, S: S): S {
    let state = S
    let node = this._listU
    while (node.tag === ListTag.Value) {
      state = node.head(A, state)
      node = node.tail
    }

    return state
  }
  public update_(A: A): (S: S) => S {
    return (S: S) => this.update(A, S)
  }
  public command(A: A, S: S): Command {
    throw new Error('TODO: Not Implemented')
  }
  public init(): S {
    return this._state
  }
  public view(S: S): V {
    return this._view(S)
  }

  public pipe<S1, A1>(f: (c: Component<S, A, V>) => Component<S1, A1, V>): Component<S1, A1, V> {
    return f(this)
  }

  static init<S0>(S0: S0): Component<S0, never, undefined> {
    return new Component(S0, Empty, Empty, () => undefined)
  }

  static update = <A0, S0>(F: (A: A0, S: S0) => S0) => <V1>(C1: Component<S0, A0, V1>): Component<S0, A0, V1> => {
    return new Component(C1._state, { tag: ListTag.Value, tail: C1._listU, head: F }, C1._listC, C1._view)
  }

  static accept = <A0>() => <S1, A1, V1>(C1: Component<S1, A1, V1>): Component<S1, A0, V1> => {
    return new Component(C1._state, Empty, Empty, C1._view)
  }

  get typeA(): A {
    throw new Error('TODO: Not Implemented')
  }

  get typeS(): S {
    throw new Error('TODO: Not Implemented')
  }
}

// Component 1
type C1Action = Action<'C1_1', number> | Action<'C2_2', number>
export const c1 = Component.init({ C1: 0 }).pipe(Component.accept<C1Action>())

// Component 2
type C2Action = Action<'C2_1', number> | Action<'C2_2', number>
export const c2 = Component.init({ C1: 1 }).pipe(Component.accept<C2Action>())

// Component 3
type C3Action = Action<'C3_1', number> | Action<'C1', typeof c1.typeA> | Action<'C2', typeof c2.typeA>
export const c3 = Component.init({
  node: { color: 'RED' },
  c1: c1.init(),
  c2: c2.init()
})

const c1L = Lens.fromProp<typeof c3.typeS>()('c1')
const c2L = Lens.fromProp<typeof c3.typeS>()('c2')

// Installing Components
c3.pipe(Component.accept<C3Action>()).pipe(
  Component.update((A, S) => {
    switch (A.type) {
      case 'C1':
        return c1L.modify(c1.update_(A.value))(S)

      case 'C2':
        return c2L.modify(c2.update_(A.value))(S)

      default:
        return S
    }
  })
)
