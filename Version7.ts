import { Lens } from 'monocle-ts'
import { Option, option, some, none, getOrElse } from 'fp-ts/lib/Option'
import {} from 'fp-ts/lib/'

enum ListTag {
  Empty,
  Value
}
type Empty = { tag: ListTag.Empty }
const Empty: Empty = { tag: ListTag.Empty }
type Value<A> = { tag: ListTag.Value; head: A; tail: List<A> }
type List<A> = Empty | Value<A>

type Pipe<S0, A0, S1, A1, C, V> = (C: Component<S0, A0, C, V>) => Component<S1, A1, C, V>
type PipeID<S, A, C, V> = Pipe<S, A, S, A, C, V>

class Installation<A0, S0, A1, S1, C, V> {
  constructor(
    private readonly _component: Component<S1, A1, C, V>,
    private readonly _lens: Lens<S0, S1>,
    private readonly _sel: (A: A0) => Option<A1>
  ) {}

  update(A0: A0, S0: S0): S0 {
    return getOrElse(() => S0)(option.map(this._sel(A0), AA => this._lens.modify(this._component.update_(AA))(S0)))
  }
}

type Action<T, V> = { type: T; value: V }

declare function h(name: string, children: unknown[]): string

class Component<S, A, C, V> {
  constructor(
    readonly _state: S,
    readonly _listU: List<(A: A, S: S) => S>,
    readonly _listC: List<(A: A, S: S) => C>,
    readonly _view: (S: S) => V
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
  public command(A: A, S: S): C {
    throw new Error('TODO: Not Implemented')
  }
  public init(): S {
    return this._state
  }
  public view(S: S): V {
    return this._view(S)
  }

  public pipe<S1, A1>(f: (c: Component<S, A, C, V>) => Component<S1, A1, C, V>): Component<S1, A1, C, V> {
    return f(this)
  }

  static init<S0>(S0: S0): Component<S0, never, never, undefined> {
    return new Component(S0, Empty, Empty, () => undefined)
  }

  static update = <A0, S0>(F: (A: A0, S: S0) => S0) => <C, V1>(
    C1: Component<S0, A0, C, V1>
  ): Component<S0, A0, C, V1> => {
    return new Component(C1._state, { tag: ListTag.Value, tail: C1._listU, head: F }, C1._listC, C1._view)
  }

  static accept = <A0>() => <S1, A1, C1, V1>(C1: Component<S1, A1, C1, V1>): Component<S1, A0, never, V1> => {
    return new Component(C1._state, Empty, Empty, C1._view)
  }

  get typeS(): S {
    throw new Error('Invalid Access `typeS`')
  }

  get typeA(): A {
    throw new Error('Invalid Access `typeA`')
  }

  get typeC(): C {
    throw new Error('Invalid Access `typeC`')
  }

  lensProp<P extends keyof S>(propName: P): Lens<S, S[P]> {
    return Lens.fromProp<S>()(propName)
  }

  static install<A, S>(F: (A: A, S: S) => S): <C, V>(C: Component<S, A, C, V>) => Component<S, A, C, V> {
    return C =>
      new Component(C._state, { tag: ListTag.Value, tail: C._listU, head: (A, S) => F(A, S) }, C._listC, C._view)
  }

  package<A0, S0>(lens: Lens<S0, S>, sel: (A0: A0) => Option<A>): PipeID<S0, A0, C, V> {
    return Component.install((A0, S0) => new Installation(this, lens, sel).update(A0, S0))
  }
}

// Component 1 (Root)
type C1Action = Action<'c1_1', number> | Action<'c1_2', number>
export const c1 = Component.init({ C1: 1 }).pipe(Component.accept<C1Action>())

// Component 2 (Child 1)
type C2Action = Action<'c2_1', number> | Action<'c2_2', number>
export const c2 = Component.init({ C2: 1 }).pipe(Component.accept<C2Action>())

// Component 3 (Child 2)
type C3Action = Action<'c3', number> | Action<'c1', C1Action> | Action<'c2', C2Action>
export const c3 = Component.init({
  node: { color: 'RED' },
  c1: c1.init(),
  c2: c2.init()
}).pipe(Component.accept<C3Action>())

// Installing Components
const c3_ = c3
  .pipe(c1.package(Lens.fromProp<typeof c3.typeS>()('c1'), A => (A.type === 'c1' ? some(A.value) : none)))
  .pipe(c2.package(Lens.fromProp<typeof c3.typeS>()('c2'), A => (A.type === 'c2' ? some(A.value) : none)))

// TEST / EXPERIMENT
console.log(c3_.update({ type: 'c1', value: { type: 'c1_1', value: 1000 } }, c3_.init()))
