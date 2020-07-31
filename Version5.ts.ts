import { Lens } from 'monocle-ts'
import { Option, option, some, none, getOrElse } from 'fp-ts/lib/Option'

export interface Command {}

const EMPTY: Command = {}

enum ListTag {
  Empty,
  Value
}
type Empty = { tag: ListTag.Empty }
const Empty: Empty = { tag: ListTag.Empty }
type Value<A> = { tag: ListTag.Value; head: A; tail: List<A> }
type List<A> = Empty | Value<A>

class Installation<A0, S0, A1, S1, V> {
  constructor(
    private readonly _component: Component<S1, A1, V>,
    private readonly _lens: Lens<S0, S1>,
    private readonly _sel: (A: A0) => Option<A1>
  ) {}

  update(A0: A0, S0: S0): S0 {
    return getOrElse(() => S0)(option.map(this._sel(A0), AA => this._lens.modify(this._component.update_(AA))(S0)))
  }
}

class Action<T extends string | number, V> {
  constructor(readonly type: T, readonly value: V) {}
}

type AnyAction = Action<string | number, unknown>

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

  static install<A, S>(F: (A: A, S: S) => S): <V>(C: Component<S, A, V>) => Component<S, A, V> {
    return C =>
      new Component(C._state, { tag: ListTag.Value, tail: C._listU, head: (A, S) => F(A, S) }, C._listU, C._view)
  }

  installer<A0, S0>(lens: Lens<S0, S>, sel: (A0: A0) => Option<A>): (A0: A0, S0: S0) => S0 {
    return (A0, S0) => new Installation(this, lens, sel).update(A0, S0)
  }

  install<A0, S0>(lens: Lens<S0, S>, sel: (A0: A0) => Option<A>): (C: Component<S0, A0, V>) => Component<S0, A0, V> {
    return Component.install((A0, S0) => new Installation(this, lens, sel).update(A0, S0))
  }

  get typeS(): S {
    throw new Error('Invalid Access')
  }
  get typeA(): A {
    throw new Error('Invalid Access')
  }

  lensProp<P extends keyof S>(propName: P): Lens<S, S[P]> {
    return Lens.fromProp<S>()(propName)
  }
}

// Component 1
type C1Action = Action<'c1_1', number> | Action<'c1_2', number>
export const c1 = Component.init({ C1: 10 })
  .pipe(Component.accept<C1Action>())
  .pipe(Component.update((A, S) => ({ C1: S.C1 + A.value })))

// Component 2
type C2Action = Action<'c2_1', number> | Action<'c2_2', number>
export const c2 = Component.init({ C2: 1 }).pipe(Component.accept<C2Action>())

// Component 3
type C3Action = Action<'c3', number> | Action<'c1', C1Action> | Action<'c2', C2Action>
export const c3 = Component.init({
  node: { color: 'RED' },
  c1: c1.init(),
  c2: c2.init()
})

const c1Action = (A: C3Action) => (A.type === 'c1' ? some(A.value) : none)
const c2Action = (A: C3Action) => (A.type === 'c2' ? some(A.value) : none)

// Installing Components
const c3_ = c3
  .pipe(Component.accept<C3Action>())
  .pipe(c1.install(c3.lensProp('c1'), c1Action))
  .pipe(c2.install(c3.lensProp('c2'), c2Action))

// TEST / EXPERIMENT

console.log(c3_.update({ type: 'c1', value: { type: 'c1_1', value: 1000 } }, c3_.init()))
