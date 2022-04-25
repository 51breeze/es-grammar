@Reference('index.d.es');

@Dynamic;
declare interface Window extends IEventDispatcher{}
declare const window:Window;

@Dynamic;
declare interface Document extends IEventDispatcher{}
declare const document:Document;

declare class Node extends IEventDispatcher{}


/** An event which takes place in the DOM. */
@Dynamic;
declare class Event extends Object{
    /**
     * Returns true or false depending on how event was initialized. True if event goes through its target's ancestors in reverse tree order, and false otherwise.
     */
    const bubbles:boolean;
    /**
     * Returns true or false depending on how event was initialized. Its return value does not always carry meaning, but true can indicate that part of the operation during which event was dispatched, can be canceled by invoking the preventDefault() method.
     */
    const cancelable:boolean;
    /**
     * Returns true or false depending on how event was initialized. True if event invokes listeners past a ShadowRoot node that is the root of its target, and false otherwise.
     */
    const composed: boolean;
    /**
     * Returns the object whose event listener's callback is currently being invoked.
     */
    const currentTarget: IEventDispatcher | null;
    /**
     * Returns true if preventDefault() was invoked successfully to indicate cancelation, and false otherwise.
     */
    const defaultPrevented: boolean;
    /**
     * Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET, and BUBBLING_PHASE.
     */
    const eventPhase: number;
    /**
     * Returns true if event was dispatched by the user agent, and false otherwise.
     */
    const isTrusted: boolean;
    var returnValue: boolean;
   
    /**
     * Returns the object to which event is dispatched (its target).
     */
    const target: IEventDispatcher | null;
    /**
     * Returns the event's timestamp as the number of milliseconds measured relative to the time origin.
     */
    const timeStamp: number;
    /**
     * Returns the type of event, e.g. "click", "hashchange", or "submit".
     */
    const type: string;
    
    /**
     * If invoked when the cancelable attribute value is true, and while executing a listener for the event with passive set to false, signals to the operation that caused event to be dispatched that it needs to be canceled.
     */
    preventDefault(): void;
    /**
     * Invoking this method prevents event from reaching any registered event listeners after the current one finishes running and, when dispatched in a tree, also prevents event from reaching any other objects.
     */
    stopImmediatePropagation(): void;
    /**
     * When dispatched in a tree, invoking this method prevents event from reaching any objects other than the current object.
     */
    stopPropagation(): void;

    constructor(type:string, bubbles?:boolean,cancelable?:boolean);
}


/** EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them. */
declare interface IEventDispatcher {
    /**
     * Appends an event listener for events whose type attribute value is type. 
     * The callback argument sets the callback that will be invoked when the event is dispatched.
     */
    addEventListener(type: string, listener: (event?:Event)=>void ): this;
    /**
     * Dispatches a synthetic event event to target and returns true 
     * if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
     */
    dispatchEvent(event: Event): boolean;
    /**
     * Removes the event listener in target's event listener list with the same type, callback, and options.
     */
    removeEventListener(type: string, listener?: (event?:Event)=>void ): boolean;

    /**
    * Checks whether a listener of the specified type has been added
    */
    hasEventListener(type: string, listener?: (event?:Event)=>void):boolean;
}

/** EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them. */
declare class EventDispatcher extends Object implements IEventDispatcher{
    constructor(target?:object);
}