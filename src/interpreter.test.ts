import { evaluate, Expr } from "./interpreter"

/*
Here are some tests that demonstrate how the language works.

to build expressions more easily, I created helpers that are below the test suite.
*/

describe(evaluate.name, () => {
    const emptyEnvironment = new Map()

    it("evaluates variable references", () => {
        // One way to make a standard library for a language is
        // by including variable bindings in the initial environment
        const initialEnvironment = new Map()
        initialEnvironment.set("pi", 3.14)
        initialEnvironment.set("four", 4)
        expect(evaluate(variable("pi"), initialEnvironment)).toEqual(3.14)
        expect(evaluate(plus(variable("four"), variable("four")), initialEnvironment)).toEqual(8)
    })

    it("handles unbound variables", () => {
        expect(() => evaluate(variable("x"), emptyEnvironment)).toThrow()
        expect(() => evaluate(plus(number(2), variable("x")), emptyEnvironment)).toThrow()
    })

    it("evaluates numbers", () => {
        expect(evaluate(number(1), emptyEnvironment)).toEqual(1)
        expect(evaluate(number(2), emptyEnvironment)).toEqual(2)
    })

    it("evaluates booleans", () => {
        expect(evaluate(boolean(true), emptyEnvironment)).toEqual(true)
        expect(evaluate(boolean(false), emptyEnvironment)).toEqual(false)
    })

    it("evaluates +", () => {
        expect(evaluate(plus(number(1), number(2)), emptyEnvironment)).toEqual(3)
        expect(evaluate(plus(plus(number(1), number(2)), number(3)), emptyEnvironment)).toEqual(6)
    })

    it("handles non-numbers on +", () => {
        expect(() => evaluate(plus(boolean(false), number(1)), emptyEnvironment)).toThrow()
        expect(() => evaluate(plus(number(0), boolean(true)), emptyEnvironment)).toThrow()
        expect(() => evaluate(plus(boolean(false), boolean(true)), emptyEnvironment)).toThrow()
    })

    it("evaluates <", () => {
        expect(evaluate(lessThan(number(1), number(2)), emptyEnvironment)).toEqual(true)
        expect(evaluate(lessThan(number(1), number(1)), emptyEnvironment)).toEqual(false)
        expect(evaluate(lessThan(number(2), number(1)), emptyEnvironment)).toEqual(false)
        expect(evaluate(lessThan(number(1), plus(number(1), number(1))), emptyEnvironment)).toEqual(true)
    })

    it("handles non-numbers on <", () => {
        expect(() => evaluate(lessThan(boolean(false), number(1)), emptyEnvironment)).toThrow()
        expect(() => evaluate(lessThan(number(0), boolean(true)), emptyEnvironment)).toThrow()
        expect(() => evaluate(lessThan(boolean(false), boolean(true)), emptyEnvironment)).toThrow()
    })

    it("evaluates &&", () => {
        expect(evaluate(and(boolean(false), boolean(false)), emptyEnvironment)).toEqual(false)
        expect(evaluate(and(boolean(false), boolean(true)), emptyEnvironment)).toEqual(false)
        expect(evaluate(and(boolean(true), boolean(false)), emptyEnvironment)).toEqual(false)
        expect(evaluate(and(boolean(true), boolean(true)), emptyEnvironment)).toEqual(true)
        // truthy and falsy values
        expect(evaluate(and(number(0), number(1)), emptyEnvironment)).toEqual(0)
        expect(evaluate(and(number(1), number(2)), emptyEnvironment)).toEqual(2)
    })

    it("short-circuits &&", () => {
        // the interpreter never tries to evaluate the unbound x
        expect(evaluate(and(boolean(false), variable("x")), emptyEnvironment)).toEqual(false)
        expect(() => evaluate(and(boolean(true), variable("x")), emptyEnvironment)).toThrow()
        expect(() => evaluate(and(variable("x"), boolean(false)), emptyEnvironment)).toThrow()
    })

    it("evaluates ||", () => {
        expect(evaluate(or(boolean(false), boolean(false)), emptyEnvironment)).toEqual(false)
        expect(evaluate(or(boolean(false), boolean(true)), emptyEnvironment)).toEqual(true)
        expect(evaluate(or(boolean(true), boolean(false)), emptyEnvironment)).toEqual(true)
        expect(evaluate(or(boolean(true), boolean(true)), emptyEnvironment)).toEqual(true)
        expect(evaluate(or(number(0), number(1)), emptyEnvironment)).toEqual(1)
        expect(evaluate(or(number(1), number(2)), emptyEnvironment)).toEqual(1)
    })

    it("short-circuits ||", () => {
        expect(evaluate(or(boolean(true), variable("x")), emptyEnvironment)).toEqual(true)
        expect(() => evaluate(or(boolean(false), variable("x")), emptyEnvironment)).toThrow()
        expect(() => evaluate(or(variable("x"), boolean(true)), emptyEnvironment)).toThrow()
    })

    it("evaluates !", () => {
        expect(evaluate(not(boolean(false)), emptyEnvironment)).toEqual(true)
        expect(evaluate(not(boolean(true)), emptyEnvironment)).toEqual(false)
        expect(evaluate(not(number(1)), emptyEnvironment)).toEqual(false)
        expect(evaluate(not(number(0)), emptyEnvironment)).toEqual(true)
    })

    it("evaluates -", () => {
        expect(evaluate(negate(number(1)), emptyEnvironment)).toEqual(-1)
    })

    it("handles non-numbers on -", () => {
        expect(() => evaluate(negate(boolean(true)), emptyEnvironment)).toThrow()
    })

    it("evaluates if", () => {
        expect(evaluate(ifExpr(boolean(true), number(1), number(2)), emptyEnvironment)).toEqual(1)
        expect(evaluate(ifExpr(boolean(false), number(1), number(2)), emptyEnvironment)).toEqual(2)
    })

    it("short circuits if", () => {
        expect(evaluate(ifExpr(boolean(true), number(1), variable("x")), emptyEnvironment)).toEqual(1)
        expect(evaluate(ifExpr(number(2), number(1), variable("x")), emptyEnvironment)).toEqual(1)
        expect(evaluate(ifExpr(boolean(false), variable("x"), number(1)), emptyEnvironment)).toEqual(1)
        expect(evaluate(ifExpr(number(0), variable("x"), number(1)), emptyEnvironment)).toEqual(1)
        expect(() => evaluate(ifExpr(boolean(true), variable("x"), number(1)), emptyEnvironment)).toThrow()
        expect(() => evaluate(ifExpr(boolean(false), number(1), variable("x")), emptyEnvironment)).toThrow()
    })

    it("evaluates functions", () => {
        expect(evaluate(func("x", (variable("x"))), emptyEnvironment)).toEqual({argumentName: "x", body: variable("x"), environment: emptyEnvironment})
    })

    it("evaluates function calls", () => {
        expect(evaluate(call(func("x", variable("x")), number(1)), emptyEnvironment)).toEqual(1)
        expect(evaluate(call(func("x", number(1)), number(2)), emptyEnvironment)).toEqual(1)
    })

    it("handles functions closing over arguments", () => {
        /*
        // I want to test this:

        function foo(x) {
            return function(y) {
                return x
            }
        }
        foo(1)(2) // same as (foo(1))(2)
        // should be 1

        // also
        const bar = foo(1)
        bar(2)
        bar(3)
        bar(false)
        // they should all evaluate to 1
        // foo(1) returns a function that "remembers" the 1.
        // this is because of closures, and it's why we save the current environment
        // when we evaluate functions

        we have to write it like this though
        (x => (y => x))(1)(2)
        */
        expect(evaluate(call(call(func("x", func("y", variable("x"))), number(1)), number(2)), emptyEnvironment)).toEqual(1)
        // (x => (y => x))(1)
        expect(evaluate(call(func("x", func("y", variable("x"))), number(1)), emptyEnvironment)).toEqual({
            argumentName: "y",
            body: variable("x"),
            // the function remembers x = 1
            environment: new Map().set("x", 1)
        })
    })

    it("handles variable shadowing", () => {
        // (x => (x => x))(1)(2)
        // it should use the inner x, which will be 2
        expect(evaluate(call(call(func("x", func("x", variable("x"))), number(1)), number(2)), emptyEnvironment)).toEqual(2)
        // (x => (x => x))(1)
        expect(evaluate(call(func("x", func("x", variable("x"))), number(1)), emptyEnvironment)).toEqual({
            argumentName: "x",
            body: variable("x"),
            // the function remembers x = 1,
            // but it doesn't actually use it because that "x" gets shadowed by the argument x.
            // The variable ends up getting overwritten by doing environment.set("x", 2)
            // when the function is called with the argument 2
            environment: new Map().set("x", 1)
        })
    })
})


// some helpers for creating expressions

function variable(name: string): Expr {
    return {
        type: "variable",
        name: name
    }
}

function number(value: number): Expr {
    return {
        type: "number",
        value: value
    }
}

function boolean(value: boolean): Expr {
    return {
        type: "boolean",
        value: value
    }
}

function plus(left: Expr, right: Expr): Expr {
    return {
        type: "binop",
        left: left,
        operator: "+",
        right: right
    }
}

function lessThan(left: Expr, right: Expr): Expr {
    return {
        type: "binop",
        left: left,
        operator: "<",
        right: right
    }
}

function or(left: Expr, right: Expr): Expr {
    return {
        type: "binop",
        left: left,
        operator: "||",
        right: right
    }
}

function and(left: Expr, right: Expr): Expr {
    return {
        type: "binop",
        left: left,
        operator: "&&",
        right: right
    }
}

function not(argument: Expr): Expr {
    return {
        type: "unop",
        operator: "!",
        argument: argument
    }
}

function negate(argument: Expr): Expr {
    return {
        type: "unop",
        operator: "-",
        argument: argument
    }
}

function ifExpr(condition: Expr, then: Expr, elseExpr: Expr): Expr {
    return {
        type: "if",
        condition: condition,
        then: then,
        else: elseExpr
    }
}

function func(argumentName: string, body: Expr): Expr {
    return {
        type: "function",
        argumentName: argumentName,
        body: body
    }
}

function call(functionExpr: Expr, argument: Expr): Expr {
    return {
        type: "function-call",
        function: functionExpr,
        argument: argument
    }
}