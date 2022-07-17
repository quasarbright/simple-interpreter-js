# Simple interpreter in javascript/typescript

This is a simple interpreter for a subset of javascript, written in typescript.

The interpreter is located in `src/interpreter.ts` and there are tests in `src/interpreter.test.ts` showing the language in action

This was written to demonstrate how programming languages work. While this is a very simple language, it shows some of the tricks and tools that are used to implement languages. Making a little language isn't as hard as it seems. There are a few tricks you need to know, like how to deal with variables and functions, and a few subtle details like short-circuiting and closures, but after you understand stuff like that, it's not that hard to expand a language like this into a somewhat use-able language!

This language may seem pretty bare-bones, but it has more than you need to do anything a full language like real javascript can do.

For example, local variables can be implemented using anonymous functions:

```js
function(x) {
    const y = 1 + x
    return 2 + y
}
// is equivalent to
(x => (y => 2 + y)(1 + x))
```

In general, `const x = e; stuff...` is equivalent to `(x => stuff...)(e)`. If you wanted to implement an expression version of `const` in your language, you could just translate it to its equivalent form using only anonymous functions.

Pretty much everything you use in a language can technically be written with just anonymous functions, function calls, and variables. This includes [numbers, booleans](https://en.wikipedia.org/wiki/Church_encoding), and even [recursion](https://mvanier.livejournal.com/2897.html). They can also be directly implemented of course, which is what pretty much every language does. Still cool though!