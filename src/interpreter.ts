
/*
This is an interpreter for a subset of javascript. It supports numbers, booleans,
arithmetic, comparison, logical operations, conditionals, and functions. Everything is an expression.
There are no statements.

There is no type coercion for binary operators like "+", but there are truthy and falsy values like js.

This was written to demonstrate how programming languages work.
See "./interpreter.test.ts" for examples of running programs.

Here is the language grammar. This describes the syntax of the language. 
"|" separates cases for each type of syntax

<expr> := <identifier>                variable reference
        | <number>                    number
        | <boolean>                   boolean
        | <expr> <binop> <expr>       arithmetic/logical expression
        | <unop> <expr>               boolean not or numeric negation
        | <expr> ? <expr> : <expr>    ternary if
        | <identifier> => <expr>      anonymous function
        | <expr>(<expr>)              function call
<binop> := + | < | || | &&            binary operator
<unop> := ! | -                       unary operator

I'm not going to make a parser. A parser would convert a string to an Expr, which is the type of the abstract syntax tree.

The abstract syntax tree is an object that represents the concrete syntax. The concrete syntax is what a user of the language
writes in, and the abstract syntax is how the syntax is represented in the interpreter/compiler.
*/

/**
 * The type of the abstract syntax tree.
 * Represents an expression.
 */
export type Expr = {
    type: "variable",
    name: string
} | {
    type: "number"
    value: number
} | {
    type: "boolean"
    value: boolean
} | {
    type: "binop"
    left: Expr
    operator: Binop
    right: Expr
} | {
    type: "unop"
    operator: Unop
    argument: Expr
} | {
    type: "if"
    condition: Expr
    then: Expr
    else: Expr
} | {
    type: "function"
    argumentName: string
    body: Expr
} | {
    type: "function-call"
    function: Expr
    argument: Expr
}

/**
 * Binary operators
 */
type Binop = "+" | "<" | "||" | "&&"

/**
 * Unary operators
 */
type Unop = "!" | "-"

/**
 * The type of values
 */
type Value = number | boolean | FunctionValue

type FunctionValue = {
    argumentName: string
    // This environment is necessary for closures. Visit this link for more info:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
    environment: Environment
    body: Expr
}

/** 
 * The type of the environment, which maps variable names to their values.
 */
type Environment = Map<string, Value>

/**
 * Evaluate the expression in the given environment.
 * 
 * @param expr expression to evaluate
 * @param environment environment mapping variable names to their values
 * @returns the evaluated value of the expression
 */
export function evaluate(expr: Expr, environment: Environment): Value {
    switch (expr.type) {
        case "variable":
            const name = expr.name
            if (environment.has(name)) {
                // the variable name is in the environment
                return environment.get(name)!
            } else {
                throw Error("unbound variable: " + name)
            }
        case "number":
        case "boolean":
            return expr.value
        case "binop":
            switch (expr.operator) {
                case "+": {
                    const leftValue = evaluate(expr.left, environment)
                    const rightValue = evaluate(expr.right, environment)
                    // "typeof" is a built-in in typescript that returns a string for the type of an expression. 
                    // It has nothing to do with our expr.type strings. That is just a coincidence
                    // https://www.typescriptlang.org/docs/handbook/2/typeof-types.html
                    if (typeof leftValue !== "number" || typeof rightValue !== "number") {
                        throw Error("+ expects two numbers")
                    } else {
                        return leftValue + rightValue
                    }
                }
                case "<": {
                    const leftValue = evaluate(expr.left, environment)
                    const rightValue = evaluate(expr.right, environment)
                    if (typeof leftValue !== "number" || typeof rightValue !== "number") {
                        throw Error("< expects two numbers")
                    } else {
                        return leftValue < rightValue
                    }
                }
                case "||": {
                    const leftValue = evaluate(expr.left, environment)
                    // we don't want the right expression to evaluate if the left one is true.
                    // this is called short-circuiting
                    if (isTruthy(leftValue)) {
                        // Notice how we don't care if this is a boolean.
                        // for example: 3 || true evaluates to 3
                        // That's how javascript works, so we're doing it too
                        return leftValue
                    } else {
                        const rightValue = evaluate(expr.right, environment)
                        return rightValue
                    }
                }
                case "&&": {
                    const leftValue = evaluate(expr.left, environment)
                    if (isTruthy(leftValue)) {
                        const rightValue = evaluate(expr.right, environment)
                        return rightValue
                    } else {
                        return leftValue
                    }
                }
            }
        case "unop":
            const argumentValue = evaluate(expr.argument, environment)
            switch (expr.operator) {
                case "!":
                    if (isTruthy(argumentValue)) {
                        return false
                    } else {
                        return true
                    }
                // we could also just return !isTruthy(argumentValue) since
                // it always returns a boolean
                case "-":
                    if (typeof argumentValue !== "number") {
                        throw Error("- expects a number")
                    } else {
                        return -argumentValue
                    }
            }
        case "if":
            const conditionValue = evaluate(expr.condition, environment)
            if (isTruthy(conditionValue)) {
                // we only evaluate the "then" branch if the condition is true
                const thenValue = evaluate(expr.then, environment)
                return thenValue
            } else {
                const elseValue = evaluate(expr.else, environment)
                return elseValue
            }
        case "function":
            return {
                argumentName: expr.argumentName,
                // we save the environment where the function is defined.
                // when we call the function, the body runs in this environment,
                // not the environment of where it is called.
                environment: environment,
                body: expr.body
            }
        case "function-call":
            const functionValue = evaluate(expr.function, environment)
            // We ensure the value is an object because
            // we represent function values as javascript objects
            if (typeof functionValue !== "object") {
                throw Error("cannot call a value that is not a function")
            } else {
                const argumentValue = evaluate(expr.argument, environment)
                // create a copy of the function's environment that also has
                // argumentName = argumentValue in it.
                // This lets the function body reference the argument.
                // Notice how bodyEnvironment has nothing to do with the environment
                // that was passed to us in this evaluate call.
                const bodyEnvironment = new Map(functionValue.environment)
                bodyEnvironment.set(functionValue.argumentName, argumentValue)
                // So to evaluate a function call, we just evaluate the function's body using the 
                // function's environment with argumentName set to argumentValue
                return evaluate(functionValue.body, bodyEnvironment)
            }
    }
}

/**
 * Is the value truthy? Used for logical operations and "if".
 * 
 * @param value value
 * @returns a boolean representing whether the value is truthy
 */
function isTruthy(value: Value): boolean {
    // There are only two falsy values, so we can just see if it's one of them
    // all functions are truthy
    const isFalsy = value === 0 || value === false
    return !isFalsy
}
