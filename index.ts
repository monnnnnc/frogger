/**
# Introduction

We may record asynchronous events, such as user interface events, in streams using observables. These enable us to handle the stream using just pure, referentially transparent functions, eliminate deeply nested loops, and "linearize" the control flow.

We'll create a simple "Asteroids" game as an illustration utilizing Observables. Our Observable implementation will be [rxjs](https://rxjs-dev.firebaseapp.com), and we'll use SVG to represent it in HTML.

Additionally, we will build pure functional code with tons of gorgeous curried lambda (arrow) functions. We'll make sure that our data is immutable using [typescript type annotations](https://www.typescriptlang.org/), and we'll utilize them to assist us plug everything together without making any type mistakes.

[Reference](https://tgdwyer.github.io/asteroids/)
[Documentation](https://github.com/monnnnnc/frogger/)
 */
import { fromEvent, interval, merge, takeWhile } from 'rxjs';
import { map, filter, scan } from 'rxjs/operators';

type Event = 'keydown';
type Key =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowRight'
  | 'ArrowLeft'
  | 'Enter'
  | 'Space';

function frogger() {
  const Constants = {
    CanvasSize: 600,
    StartInstanceRadius: 20,
    StartInstanceCount: 3,
    StartRows: 3,
    StartTime: 0,
    ScorePoints: 500,
    NumberGoal: 5,
    FinalScorePoints: 1000,
  } as const;

  // our game has the following view element types:
  type ViewType =
    | 'car'
    | 'frog'
    | 'plank'
    | 'river'
    | 'goal'
    | 'finalgoal'
    | 'goose'
    | 'bird';

  // Four types of game state transitions
  class Tick {
    constructor(public readonly elapsed: number) {}
  }
  class Move {
    constructor(public readonly direction: string) {}
  }
  class Restart {
    constructor() {}
  }
  class Jump {
    constructor() {}
  }

  const gameClock = interval(10).pipe(map((elapsed) => new Tick(elapsed))),
    keyObservable = <T>(e: Event, k: Key, result: () => T) =>
      fromEvent<KeyboardEvent>(document, e).pipe(
        filter(({ code }) => code === k),
        map(result)
      ),
    moveUp = keyObservable('keydown', 'ArrowUp', () => new Move('up')),
    moveRight = keyObservable('keydown', 'ArrowRight', () => new Move('right')),
    moveLeft = keyObservable('keydown', 'ArrowLeft', () => new Move('left')),
    moveDown = keyObservable('keydown', 'ArrowDown', () => new Move('down')),
    jump = keyObservable('keydown', 'Space', () => new Jump()),
    restart = keyObservable('keydown', 'Enter', () => new Restart());

  type Circle = Readonly<{ pos: Vec; radius: number }>;
  type Rectangle = Readonly<{ pos: Vec; width: number; height: number }>;
  type ObjectId = Readonly<{ id: string; createTime: number }>;
  interface IBody extends Circle, ObjectId {
    viewType: ViewType;
    vel: Vec;
    acc: Vec;
  }
  interface IGround extends ObjectId, Rectangle {
    viewType: ViewType;
  }

  // Every object that participates in physics is a Body
  type Body = Readonly<IBody>;
  type Ground = Readonly<IGround>;

  // Game state
  type State = Readonly<{
    time: number;
    frog: Body;
    cars: ReadonlyArray<Body>;
    planks: ReadonlyArray<Body>;
    river: Ground;
    geese: ReadonlyArray<Body>;
    birds: ReadonlyArray<Body>;
    goals: ReadonlyArray<Body>;
    finalgoal: ReadonlyArray<Body>;
    exit: ReadonlyArray<Body>;
    objCount: number;
    gameOver: boolean;
    points: number;
    highscore: number;
  }>;

  // All instances, excepts frog, are just circles (dividen by colours)
  const createCircle =
      (viewType: ViewType) => (oid: ObjectId) => (circ: Circle) => (vel: Vec) =>
        <Body>{
          ...oid,
          ...circ,
          vel: vel,
          acc: Vec.Zero,
          id: viewType + oid.id,
          viewType: viewType,
        },
    createCar = createCircle('car'),
    createPlank = createCircle('plank'),
    createGoose = createCircle('goose'),
    createBird = createCircle('bird');

  function createFrog(): Body {
    return {
      id: 'frog',
      viewType: 'frog',
      pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize - 50),
      vel: Vec.Zero,
      acc: Vec.Zero,
      radius: 20,
      createTime: 0,
    };
  }

  function createRiver(): Ground {
    return {
      id: 'river',
      viewType: 'river',
      pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize - 50),
      width: Constants.CanvasSize,
      height: Constants.CanvasSize / 4,
      createTime: 0,
    };
  }

  function createGoal(i: number): Body {
    return {
      id: 'goal' + i,
      viewType: 'goal',
      pos: new Vec(100 * (i + 1), 50),
      vel: Vec.Zero,
      acc: Vec.Zero,
      radius: 20,
      createTime: 0,
    };
  }

  function createFinalGoal(i: number): Body {
    return {
      id: 'finalgoal' + i,
      viewType: 'finalgoal',
      pos: new Vec(300 * (i + 1), 50),
      vel: Vec.Zero,
      acc: Vec.Zero,
      radius: 20,
      createTime: 0,
    };
  }

  // Observable streams for each and every movements and how each instances works
  const speedDirections = (v: number, d: string) =>
      new Vec(d == 'left' ? -1 * v : v), // change speed and direction
    startCars = [
      ...Array(Constants.StartInstanceCount * Constants.StartRows),
    ].map((_, i) =>
      createCar({ id: String(i), createTime: i })({
        pos:
          i < Constants.StartRows * 1
            ? new Vec(1000 * (i + 1), Constants.CanvasSize - 100)
            : i < Constants.StartRows * 2
            ? new Vec(1000 * (i + 1), Constants.CanvasSize - 150)
            : new Vec(1000 * (i + 1), Constants.CanvasSize - 200), // change position
        radius: Constants.StartInstanceRadius,
      })(
        i < Constants.StartRows * 1
          ? speedDirections(0.5, 'right')
          : i < Constants.StartRows * 2
          ? speedDirections(1, 'left')
          : speedDirections(0.2, 'left')
      )
    ),
    startPlanks = [
      ...Array(Constants.StartInstanceCount * Constants.StartRows),
    ].map((_, i) =>
      createPlank({ id: String(i), createTime: i })({
        pos:
          i < Constants.StartRows * 1
            ? new Vec(1000 * (i + 1), 200)
            : i < Constants.StartRows * 2
            ? new Vec(1000 * (i + 1), 250)
            : new Vec(1000 * (i + 1), 300), // change position
        radius: Constants.StartInstanceRadius,
      })(
        i < Constants.StartRows * 1
          ? speedDirections(0.5, 'left')
          : i < Constants.StartRows * 2
          ? speedDirections(1, 'left')
          : speedDirections(0.3, 'right')
      )
    ),
    startGeese = [
      ...Array(Constants.StartInstanceCount * Constants.StartRows),
    ].map((_, i) =>
      createGoose({ id: String(i), createTime: i })({
        pos: new Vec(1000 * (i + 1), 150), // change position
        radius: Constants.StartInstanceRadius,
      })(speedDirections(0.2, 'right'))
    ),
    initialBirdsDirections = [...Array(Constants.StartInstanceCount)].map(
      (_, i) => new Vec(0.5 - i, 0.5 - i * 2)
    ),
    startBirds = [...Array(Constants.StartInstanceCount)].map((_, i) =>
      createBird({ id: String(i), createTime: Constants.StartTime })({
        pos: Vec.Zero,
        radius: Constants.StartInstanceRadius,
      })(initialBirdsDirections[i])
    ),
    startGoal = [...Array(Constants.NumberGoal)].map((_, i) => createGoal(i)),
    startFinalGoal = [...Array(1)].map((_, i) => createFinalGoal(i)),
    initialState: State = {
      time: 0,
      frog: createFrog(),
      cars: startCars,
      planks: startPlanks,
      geese: startGeese,
      birds: startBirds,
      river: createRiver(),
      goals: startGoal,
      finalgoal: [],
      exit: [],
      objCount: Constants.StartInstanceCount,
      gameOver: false,
      points: 0,
      highscore: 0,
    },
    // wrap a positions around edges of the screen
    torusWrap = ({ x, y }: Vec) => {
      const s = Constants.CanvasSize,
        wrap = (v: number) => (v < 0 ? v + s : v > s ? v - s : v);
      return new Vec(wrap(x), wrap(y));
    },
    // all movement comes through here
    moveBody = (o: Body) =>
      <Body>{
        ...o,
        pos: torusWrap(o.pos.add(o.vel)),
        vel: o.vel.add(o.acc),
      },
    // check a State for collisions:
    //   frog colliding with instances with respective effects, including ends game
    handleCollisions = (s: State) => {
      const bodiesCollided = ([a, b]: [Body, Body]) =>
          a.pos.sub(b.pos).len() < a.radius + b.radius,
        bodiesRide = ([a, b]: [Body, Body]) =>
          a.pos.sub(b.pos).len() < a.radius - 7 + b.radius,
        frogCollided =
          s.cars.filter((r) => bodiesCollided([s.frog, r])).length > 0 ||
          s.birds.filter((r) => bodiesCollided([s.frog, r])).length > 0,
        frogRides =
          s.planks.filter((r) => bodiesRide([s.frog, r])).length > 0 ||
          s.geese.filter((r) => bodiesRide([s.frog, r])).length > 0,
        riddenPlank = s.planks.filter((r) => bodiesCollided([s.frog, r])),
        riddenGoose = s.geese.filter((r) => bodiesRide([s.frog, r])),
        frogOutside = s.frog.pos.x <= 0 || s.frog.pos.x >= Constants.CanvasSize,
        frogInRiver = s.frog.pos.y < 350 && s.frog.pos.y > 100,
        frogInRiverAndPlank = frogRides ? !frogInRiver : frogInRiver,
        goalsCollide = s.goals.filter((r) => bodiesRide([s.frog, r])),
        finalGoalsCollide = s.finalgoal.filter((r) => bodiesRide([s.frog, r])),
        scorePoint = goalsCollide.length > 0,
        cut = except((a: Body) => (b: Body) => a.id === b.id);

      return <State>{
        ...s,
        gameOver: frogCollided || frogOutside || frogInRiverAndPlank,
        frog:
          !scorePoint && !(finalGoalsCollide.length > 0)
            ? {
                ...s.frog,
                vel:
                  frogRides && riddenGoose.length > 0
                    ? new Vec(-1 * riddenGoose[0].vel.x)
                    : frogRides && riddenPlank.length > 0
                    ? new Vec(riddenPlank[0].vel.x)
                    : Vec.Zero,
              }
            : {
                ...s.frog,
                pos: new Vec(
                  Constants.CanvasSize / 2,
                  Constants.CanvasSize - 50
                ),
              },
        goals: cut(s.goals)(goalsCollide),
        exit: s.exit.concat(goalsCollide),
        points: scorePoint
          ? s.points + Constants.ScorePoints
          : finalGoalsCollide.length > 0
          ? s.points + Constants.FinalScorePoints
          : s.points,
      };
    },
    // interval tick: bodies move
    tick = (s: State, elapsed: number) => {
      return s.gameOver
        ? handleCollisions({ ...s })
        : handleCollisions({
            ...s,
            frog: moveBody(s.frog),
            cars: s.cars.map(moveBody),
            planks: s.planks.map(moveBody),
            geese: s.geese.map(moveBody),
            birds: s.goals.length <= 0 ? s.birds.map(moveBody) : s.birds,
            finalgoal: s.goals.length <= 0 ? startFinalGoal : [],
            time: elapsed,
          });
    },
    // state transducer
    reduceState = (s: State, e: Tick | Move | Restart | Jump) =>
      e instanceof Move && !s.gameOver
        ? {
            ...s,
            frog: {
              ...s.frog,
              pos:
                e.direction == 'right'
                  ? new Vec(
                      s.frog.pos.x == Constants.CanvasSize - 50
                        ? Constants.CanvasSize - 50
                        : s.frog.pos.x + 50,
                      s.frog.pos.y
                    )
                  : e.direction == 'left'
                  ? new Vec(
                      s.frog.pos.x == 50 ? 50 : s.frog.pos.x - 50,
                      s.frog.pos.y
                    )
                  : e.direction == 'up'
                  ? new Vec(
                      s.frog.pos.x,
                      s.frog.pos.y == 50 ? 50 : s.frog.pos.y - 50
                    )
                  : new Vec(
                      s.frog.pos.x,
                      s.frog.pos.y == Constants.CanvasSize - 50
                        ? Constants.CanvasSize - 50
                        : s.frog.pos.y + 50
                    ),
            },
          }
        : e instanceof Restart
        ? {
            ...initialState,
            highscore: s.points > s.highscore ? s.points : s.highscore,
            exit: s.finalgoal,
          }
        : e instanceof Jump
        ? {
            ...s,
            frog: {
              ...s.frog,
              pos: new Vec(
                s.frog.pos.x,
                s.frog.pos.y <= 100 ? 50 : s.frog.pos.y - 100
              ),
            },
          }
        : tick(s, e.elapsed);

  // main game stream
  const subscription = merge(
    gameClock,
    moveUp,
    moveLeft,
    moveRight,
    moveDown,
    jump,
    restart
  )
    .pipe(scan(reduceState, initialState))
    .subscribe(updateView);

  // Update the svg scene.
  // This is the only impure function in this program
  function updateView(s: State) {
    const svg = document.getElementById('svgCanvas')!,
      frog = document.getElementById('frog')!,
      river = document.getElementById('river')!,
      points = document.getElementById('points')!,
      highscore = document.getElementById('highscore')!,
      show = (id: string, condition: boolean) =>
        ((e: HTMLElement) =>
          condition ? e.classList.remove('hidden') : e.classList.add('hidden'))(
          document.getElementById(id)!
        ),
      updateBodyView = (b: Body) => {
        function createBodyView() {
          const v = document.createElementNS(svg.namespaceURI, 'ellipse')!;
          attr(v, { id: b.id, rx: b.radius, ry: b.radius });
          v.classList.add(b.viewType);
          svg.appendChild(v);
          return v;
        }
        const v = document.getElementById(b.id) || createBodyView();
        attr(v, { cx: b.pos.x, cy: b.pos.y });
      };
    show('gameover', s.gameOver == true);
    attr(frog, {
      transform: `translate(${s.frog.pos.x},${s.frog.pos.y})`,
    });
    attr(river, {
      transform: `translate(0,125)`,
    });
    svg.appendChild(frog);
    attr(points, {
      value: s.points,
    });
    attr(highscore, {
      value: s.highscore,
    });
    s.cars.forEach(updateBodyView);
    s.planks.forEach(updateBodyView);
    s.geese.forEach(updateBodyView);
    s.birds.forEach(updateBodyView);
    s.goals.forEach(updateBodyView);
    s.finalgoal.forEach(updateBodyView);
    s.exit
      .map((o) => document.getElementById(o.id))
      .filter(isNotNullOrUndefined)
      .forEach((v) => {
        try {
          svg.removeChild(v);
        } catch (e) {
          // rarely it can happen that a bullet can be in exit
          // for both expiring and colliding in the same tick,
          // which will cause this exception
          console.log('Already removed: ' + v.id);
        }
      });

    if (s.gameOver) {
    }
  }
}

setTimeout(frogger, 0);

/////////////////////////////////////////////////////////////////////
// Utility functions

/**
 * A simple immutable vector class
 */
class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (b: Vec) => new Vec(this.x + b.x, this.y + b.y);
  sub = (b: Vec) => this.add(b.scale(-1));
  len = () => Math.sqrt(this.x * this.x + this.y * this.y);
  scale = (s: number) => new Vec(this.x * s, this.y * s);
  ortho = () => new Vec(this.y, -this.x);
  rotate = (deg: number) =>
    ((rad) =>
      ((cos, sin, { x, y }) => new Vec(x * cos - y * sin, x * sin + y * cos))(
        Math.cos(rad),
        Math.sin(rad),
        this
      ))((Math.PI * deg) / 180);

  static unitVecInDirection = (deg: number) => new Vec(0, -1).rotate(deg);
  static Zero = new Vec();
}

/**
 * apply f to every element of a and return the result in a flat array
 * @param a an array
 * @param f a function that produces an array
 */
function flatMap<T, U>(
  a: ReadonlyArray<T>,
  f: (a: T) => ReadonlyArray<U>
): ReadonlyArray<U> {
  return Array.prototype.concat(...a.map(f));
}

const /**
   * Composable not: invert boolean result of given function
   * @param f a function returning boolean
   * @param x the value that will be tested with f
   */
  not =
    <T>(f: (x: T) => boolean) =>
    (x: T) =>
      !f(x),
  /**
   * is e an element of a using the eq function to test equality?
   * @param eq equality test function for two Ts
   * @param a an array that will be searched
   * @param e an element to search a for
   */
  elem =
    <T>(eq: (_: T) => (_: T) => boolean) =>
    (a: ReadonlyArray<T>) =>
    (e: T) =>
      a.findIndex(eq(e)) >= 0,
  /**
   * array a except anything in b
   * @param eq equality test function for two Ts
   * @param a array to be filtered
   * @param b array of elements to be filtered out of a
   */
  except =
    <T>(eq: (_: T) => (_: T) => boolean) =>
    (a: ReadonlyArray<T>) =>
    (b: ReadonlyArray<T>) =>
      a.filter(not(elem(eq)(b))),
  /**
   * set a number of attributes on an Element at once
   * @param e the Element
   * @param o a property bag
   */
  attr = (e: Element, o: Object) => {
    for (const k in o) e.setAttribute(k, String(o[k]));
  };
/**
 * Type guard for use in filters
 * @param input something that might be null or undefined
 */
function isNotNullOrUndefined<T extends Object>(
  input: null | undefined | T
): input is T {
  return input != null;
}
