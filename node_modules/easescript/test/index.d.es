declare interface Matchers {
       
    message(): any;

    /**
        * Expect the actual value to be `===` to the expected value.
        *
        * @param expected The expected value to compare against.
        * @param expectationFailOutput
        * @example
        * expect(thing).toBe(realThing);
        */
    toBe(expected:any, expectationFailOutput?:any): boolean;

    /**
        * Expect the actual value to be equal to the expected, using deep equality comparison.
        * @param expected Expected value.
        * @param expectationFailOutput
        * @example
        * expect(bigObject).toEqual({ "foo": ['bar', 'baz'] });
        */
    toEqual(expected:any, expectationFailOutput?:any): boolean;

    /**
        * Expect the actual value to match a regular expression.
        * @param expected Value to look for in the string.
        * @example
        * expect("my string").toMatch(/string$/);
        * expect("other string").toMatch("her");
        */
    toMatch(expected: string | RegExp, expectationFailOutput?:any): boolean;

    toBeDefined(expectationFailOutput?:any): boolean;
    toBeUndefined(expectationFailOutput?:any): boolean;
    toBeNull(expectationFailOutput?:any):boolean;
    toBeNaN(): boolean;
    toBeTruthy(expectationFailOutput?:any): boolean;
    toBeFalsy(expectationFailOutput?:any): boolean;
    toBeTrue(): boolean;
    toBeFalse(): boolean;
    toHaveBeenCalled(): boolean;
    toHaveBeenCalledBefore(expected): boolean;
    toHaveBeenCalledWith(...params:any[]): boolean;
    toHaveBeenCalledOnceWith(...params:any[]): boolean;
    toHaveBeenCalledTimes(expected: number): boolean;
    toContain(expected: any, expectationFailOutput?:any): boolean;
    toBeLessThan(expected: number, expectationFailOutput?:any): boolean;
    toBeLessThanOrEqual(expected: number, expectationFailOutput?:any): boolean;
    toBeGreaterThan(expected: number, expectationFailOutput?:any): boolean;
    toBeGreaterThanOrEqual(expected: number, expectationFailOutput?:any): boolean;
    toBeCloseTo(expected: number, precision:any, expectationFailOutput?:any): boolean;
    toThrow(expected: any): boolean;
    toThrowError(expected, message:string | RegExp): boolean;
    toThrowMatching(predicate: (thrown: any) => boolean): boolean;
    toBeNegativeInfinity(expectationFailOutput?:any): boolean;
    toBePositiveInfinity(expectationFailOutput?:any): boolean;
    toBeInstanceOf(expected:class): boolean;

    /**
        * Expect the actual value to be a DOM element that has the expected class.
        * @since 3.0.0
        * @param expected The class name to test for.
        * @example
        * var el = document.createElement('div');
        * el.className = 'foo bar baz';
        * expect(el).toHaveClass('bar');
        */
    toHaveClass(expected: string, expectationFailOutput?:any): boolean;

    /**
        * Expect the actual size to be equal to the expected, using array-like
        * length or object keys size.
        * @since 3.6.0
        * @param expected The expected size
        * @example
        * array = [1,2];
        * expect(array).toHaveSize(2);
        */
    toHaveSize(expected: number): boolean;

    /**
        * Add some context for an expect.
        * @param message Additional context to show when the matcher fails
        */
    withContext(message: string): Matchers;

    /**
        * Invert the matcher following this expect.
        */
    var not: Matchers;
}


declare function it(title:string,callback:(done?:()=>void)=>void):int;

declare function expect(result:any):Matchers;

declare class jasmine {
   public static var DEFAULT_TIMEOUT_INTERVAL:int
}