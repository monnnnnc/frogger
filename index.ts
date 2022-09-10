/**
# Introduction
[See full documentation](https://tgdwyer.github.io/asteroids/)

Observables allow us to capture asynchronous actions like user interface events in streams.  These allow us to "linearise" the flow of control, avoid deeply nested loops, and process the stream with pure, referentially transparent functions.

As an example we will build a little "Asteroids" game using Observables.  We're going to use [rxjs](https://rxjs-dev.firebaseapp.com/) as our Observable implementation, and we are going to render it in HTML using SVG.
We're also going to take some pains to make pure functional code (and lots of beautiful curried lambda (arrow) functions). We'll use [typescript type annotations](https://www.typescriptlang.org/) to help us ensure that our data is indeed immutable and to guide us in plugging everything together without type errors.
 */
import { fromEvent, interval, merge, takeWhile } from 'rxjs';
import { map, filter, scan } from 'rxjs/operators';

type Event = 'keydown';

function frogger() {
  const Constants = {
    CanvasSize: 600,
    StartCarsRadius: 20,
    StartCarsCount: 3,
    StartRows: 3,
    StartPlankCount: 3,
    StartPlankRadius: 20,
    StartTime: 0,
    ScorePoints: 500,
    NumberGoal: 5,
  } as const;

  // our game has the following view element types:
  type ViewType = 'car' | 'frog' | 'plank' | 'river' | 'goal';

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
    restart = keyObservable('keydown', 'Enter', () => new Restart());

  type Circle = Readonly<{ pos: Vec; radius: number }>;
  type Rectangle = Readonly<{ pos: Vec; width: number; height: number }>;
  type ObjectId = Readonly<{ id: string; createTime: number }>;
  interface IBody extends Circle, ObjectId {
    viewType: ViewType;
    vel: Vec;
    acc: Vec;
    ridden: boolean;
  }
  interface IGround extends ObjectId, Rectangle {
    viewType: ViewType;
    ridden: boolean;
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
    goals: ReadonlyArray<Body>;
    exit: ReadonlyArray<Body>;
    objCount: number;
    gameOver: boolean;
    points: number;
    highscore: number;
  }>;

  // Cars and bullets are both just circles
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
    createPlank = createCircle('plank');

  function createFrog(): Body {
    return {
      id: 'frog',
      viewType: 'frog',
      pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize - 500),
      vel: Vec.Zero,
      acc: Vec.Zero,
      radius: 20,
      createTime: 0,
      ridden: false,
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
      ridden: false,
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
      ridden: false,
    };
  }

  const // note: Math.random() is impure and non-deterministic (by design) it takes its seed from external state.
    // if we wanted to use randomness inside the Observable streams below, it would be better to create a
    // pseudo-random number sequence Observable that we have complete control over.
    speedDirections = (v: number, d: string) =>
      new Vec(d == 'left' ? -1 * v : v), // change speed and direction
    startCars = [...Array(Constants.StartCarsCount * Constants.StartRows)].map(
      (_, i) =>
        createCar({ id: String(i), createTime: i })({
          pos:
            i < Constants.StartRows * 1
              ? new Vec(1000 * (i + 1), Constants.CanvasSize - 100)
              : i < Constants.StartRows * 2
              ? new Vec(1000 * (i + 1), Constants.CanvasSize - 150)
              : new Vec(1000 * (i + 1), Constants.CanvasSize - 200), // change position
          radius: Constants.StartCarsRadius,
        })(
          i < Constants.StartRows * 1
            ? speedDirections(0, 'right')
            : i < Constants.StartRows * 2
            ? speedDirections(0, 'left')
            : speedDirections(0, 'left')
        )
    ),
    startPlanks = [
      ...Array(Constants.StartPlankCount * Constants.StartRows),
    ].map((_, i) =>
      createPlank({ id: String(i), createTime: i })({
        pos:
          i < Constants.StartRows * 1
            ? new Vec(1000 * (i + 1), 200)
            : i < Constants.StartRows * 2
            ? new Vec(1000 * (i + 1), 250)
            : new Vec(1000 * (i + 1), 300), // change position
        radius: Constants.StartCarsRadius,
      })(
        i < Constants.StartRows * 1
          ? speedDirections(1, 'left')
          : i < Constants.StartRows * 2
          ? speedDirections(2, 'left')
          : speedDirections(0.5, 'right')
      )
    ),
    startGoal = [...Array(Constants.NumberGoal)].map((_, i) => createGoal(i)),
    initialState: State = {
      time: 0,
      frog: createFrog(),
      cars: startCars,
      planks: startPlanks,
      river: createRiver(),
      goals: startGoal,
      exit: [],
      objCount: Constants.StartCarsCount,
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
    //   frog colliding with car ends game
    handleCollisions = (s: State) => {
      const bodiesCollided = ([a, b]: [Body, Body]) =>
          a.pos.sub(b.pos).len() < a.radius + b.radius,
        bodiesRide = ([a, b]: [Body, Body]) =>
          a.pos.sub(b.pos).len() < a.radius - 7 + b.radius,
        frogCollided =
          s.cars.filter((r) => bodiesCollided([s.frog, r])).length > 0,
        frogRides = s.planks.filter((r) => bodiesRide([s.frog, r])).length > 0,
        riddenPlank = s.planks.filter((r) => bodiesCollided([s.frog, r])),
        frogOutside = s.frog.pos.x <= 0 || s.frog.pos.x >= Constants.CanvasSize,
        frogInRiver = s.frog.pos.y < 350 && s.frog.pos.y > 100,
        frogInRiverAndPlank = frogRides ? !frogInRiver : frogInRiver,
        goalsCollide = s.goals.filter((r) => bodiesRide([s.frog, r])),
        scorePoint = goalsCollide.length > 0;

      return <State>{
        ...s,
        gameOver: frogCollided || frogOutside || frogInRiverAndPlank,
        frog: !scorePoint
          ? {
              ...s.frog,
              vel: frogRides ? new Vec(-1 * riddenPlank[0].vel.x) : Vec.Zero,
            }
          : {
              ...s.frog,
              pos: new Vec(Constants.CanvasSize / 2, Constants.CanvasSize - 50),
            },
        exit: s.exit.concat(goalsCollide),
        points: scorePoint ? s.points + Constants.ScorePoints : s.points,
      };
    },
    // interval tick: bodies move, bullets expire
    tick = (s: State, elapsed: number) => {
      return handleCollisions({
        ...s,
        frog: moveBody(s.frog),
        cars: s.cars.map(moveBody),
        planks: s.planks.map(moveBody),
        time: elapsed,
      });
    },
    // state transducer
    reduceState = (s: State, e: Tick | Move | Restart) =>
      e instanceof Move
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
          }
        : tick(s, e.elapsed);

  // main game stream
  const subscription = merge(
    gameClock,
    moveUp,
    moveLeft,
    moveRight,
    moveDown,
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
    s.goals.forEach(updateBodyView);
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
    s.planks.map((o) => document.getElementById(o.id))
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
      
      const v = document.createElementNS(svg.namespaceURI, 'text')!;
      attr(v, {
        x: Constants.CanvasSize / 6, 
        y: Constants.CanvasSize / 2, 
        class: 'gameover', 
      }); 
      v.textContent = 'Game Over'; 
      svg.appendChild(v); 
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
