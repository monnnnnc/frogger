# FIT2102__A1_S2_2022: Functional Reactive Programming

## Introduction

We may record asynchronous events, such as user interface events, in streams using observables. These enable us to handle the stream using just pure, referentially transparent functions, eliminate deeply nested loops, and "linearize" the control flow.
I have created a simple "Frogger" game (https://github.com/monnnnnc/frogger/) as an illustration utilizing Observables, where I am using RxJS (https://rxjs-dev.firebaseapp.com), as well as SVG to represent it in HTML.
Additionally, I have built the pure functional code with tons of gorgeous, curried lambda (arrow) functions to make sure that the data is immutable using typescript type annotations (https://www.typescriptlang.org/) and utilizing them to assist in plugging everything together without making any type mistakes.

***

## Why use Functional Reactive Programming?

Functional programming is enhanced by functional reactive programming (FRP), which incorporates time flow and compositional events. In fields like interactive animations, robotics, computer vision, user interfaces, and simulation, this offers a beautiful approach to describe computation.
When handling real-time updates to otherwise static content, reactive programming refers to a design paradigm that uses asynchronous programming logic. It offers an effective way to handle data changes to content whenever a user requests it—the use of automated data streams. This implementation can be seen from the use of Game Clock, where each interval of 10 milliseconds, the system will take in a fixed object and apply nonsynchronous logic to animate them. 
Pure functions make it much simpler to debug programs and write clean code. Problems can be found with a straightforward stack trace or print statement at each level because each function is just a mapping of inputs to outputs. Since FRP operates using the pure function principles, mapping the errors that came up would be much easier as most implementations on object manipulation are referred to the same functions, for example handleCollusion(). This way, program debugging requires less effort. 

***

## Why use RxJS?

RxJS is a library for creating event-based, asynchronous programming utilizing observable sequences. To handle asynchronous events as collections, it offers one core type, the Observable, as well as satellite types (Observer, Schedulers, Subjects), operators, and many more.


Below are a list of advantages of using RxJS:
Other Javascript libraries and frameworks can be utilized with RxJS. Both typescript and javascript are compatible with it.
When it comes to handling async jobs, RxJS is a fantastic library.
Reactive programming, which deals with asynchronous data calls, callbacks, and event-based applications, is supported by RxJS and leverages observables.
When combined with reactive programming, RxJS provides a vast array of operators in the mathematical, transformation, filtering, utility, conditional, error handling, and join categories that make life simple.

***

## What are the Observable Features used?

#### Observable
A function that generates an observer and ties it to the source of the anticipated values, such as clicks, mouse events from DOM elements, HTTP requests, etc., is known as an observable. Since maintaining the event whenever the user inputs a key observable requires a watcher, observable is a fantastic way to define the keys used as a user inputs. 

#### Observer
It is an object having next(), complete(), etc. methods, which are called whenever the source interacts with the observable, such as when a key is pressed, an HTTP request is made, etc.

#### Subscription
When the observable is generated, we must subscribe to it to use it. The main user input is used in this implementation to be subscribed to as we would need to observe them. It can be used to stop the execution as well, but I did not use this function in the code implementation. 

#### Operators
A pure function known as an operator accepts one observable as its input and produces another observable as its output. All functions and values defined in this code are immutable to make debugging much easier.

#### Schedulers
A scheduler manages when the subscription must begin and receives notifications as it will come in handy when preparing for the upcoming event that will happen for every interval in the Game Clock. 

***

## Game Instructions

### Main Objectives
Cross the road and collect all the coins without dying.

### Instances
Frog (Main Character) 
- Use the arrow keys to move the frogs.
Car (Dangerous)
- Avoid touching the car when crossing the road.
Plank (Safe)
- Jump to the plank platform to cross the river safely.
Goose (Safe)
- Use the Goose to cross the river, but be careful, they will send you backward 
Bird (Dangerous)
- After collecting all of the coins, the birds will come from different directions to attack you.
Coins (Goal)
- Collect them all to get the Final level.
Final Dark Coin (Bonus Points)
- Touch this dark coin to earn more points.

### Ground
- Grass (Safe)
- Road (Safe)
- River (Dangerous)

### Keys
- Press  Arrow to move to the Up
- Press  Arrow to move to the Down
- Press Left Arrow to move to the Left
- Press Right Arrow to move to the Right
- Press Spacebar to Jump
- Press Enter to Restart 


