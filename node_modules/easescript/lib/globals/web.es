@Dynamic;
declare interface Window extends IEventDispatcher{
    const location:Location;
    const document:Document;
}
declare const window:Window;

@Dynamic;
declare interface Document extends IEventDispatcher{}
declare const document:Document;

/** The location (URL) of the object it is linked to. Changes done on it are reflected on the object it relates to. Both the Document and Window interface have such a linked Location, accessible via Document.location and Window.location respectively. */
declare interface Location {
    /**
     * Returns a DOMStringList object listing the origins of the ancestor browsing contexts, from the parent browsing context to the top-level browsing context.
     */
    const ancestorOrigins: any;
    /**
     * Returns the Location object's URL's fragment (includes leading "#" if non-empty).
     *
     * Can be set, to navigate to the same URL with a changed fragment (ignores leading "#").
     */
    var hash: string;
    /**
     * Returns the Location object's URL's host and port (if different from the default port for the scheme).
     *
     * Can be set, to navigate to the same URL with a changed host and port.
     */
    var host: string;
    /**
     * Returns the Location object's URL's host.
     *
     * Can be set, to navigate to the same URL with a changed host.
     */
    var hostname: string;
    /**
     * Returns the Location object's URL.
     *
     * Can be set, to navigate to the given URL.
     */
    var href: string;
    /**
     * Returns the Location object's URL's origin.
     */
    const origin: string;
    /**
     * Returns the Location object's URL's path.
     *
     * Can be set, to navigate to the same URL with a changed path.
     */
    var pathname: string;
    /**
     * Returns the Location object's URL's port.
     *
     * Can be set, to navigate to the same URL with a changed port.
     */
    var port: string;
    /**
     * Returns the Location object's URL's scheme.
     *
     * Can be set, to navigate to the same URL with a changed scheme.
     */
    var protocol: string;
    /**
     * Returns the Location object's URL's query (includes leading "?" if non-empty).
     *
     * Can be set, to navigate to the same URL with a changed query (ignores leading "?").
     */
    var search: string;
    /**
     * Navigates to the given URL.
     */
    assign(url: string): void;
    /**
     * Reloads the current page.
     */
    reload(): void;
    /**
     * Removes the current page from the session history and navigates to the given URL.
     */
    replace(url: string): void;
    toString(): string;
}

declare const location:Location;

/** EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them. */
declare interface IEventDispatcher {
    /**
     * Appends an event listener for events whose type attribute value is type. 
     * The callback argument sets the callback that will be invoked when the event is dispatched.
     */
    addEventListener(type: string, listener: (event?:Event)=>void ): void;
    /**
     * Dispatches a synthetic event event to target and returns true 
     * if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
     */
    dispatchEvent(event: Event): boolean;
    /**
     * Removes the event listener in target's event listener list with the same type, callback, and options.
     */
    removeEventListener(type: string, listener?: (event?:Event)=>void ): void;

    /**
    * Checks whether a listener of the specified type has been added
    */
    hasEventListener(type: string, listener?: (event?:Event)=>void):boolean;
}

/** EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them. */
declare class EventDispatcher extends Object implements IEventDispatcher{
    constructor(target?:object);
}

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

/** Simple user interface events. */
@Dynamic;
declare class UIEvent extends Event {
    const detail: number;
    const view: Window | null;
    constructor(type:string, bubbles?:boolean,cancelable?:boolean);
}

/** Events that occur due to the user interacting with a pointing device (such as a mouse). Common events using this interface include click, dblclick, mouseup, mousedown. */
@Dynamic;
declare class MouseEvent extends UIEvent {

    static const MOUSE_DOWN:string='mousedown';
    static const MOUSE_UP:string='mouseup';
    static const MOUSE_OVER:string='mouseover';
    static const MOUSE_OUT:string='mouseout';
    static const MOUSE_OUTSIDE:string='mouseoutside';
    static const MOUSE_MOVE:string='mousemove';
    static const MOUSE_WHEEL:string='mousewheel';
    static const CLICK:string='click';
    static const DBLCLICK:string='dblclick';

    const altKey: boolean;
    const wheelDelta: number;
    const button: number;
    const buttons: number;
    const clientX: number;
    const clientY: number;
    const ctrlKey: boolean;
    const metaKey: boolean;
    const movementX: number;
    const movementY: number;
    const offsetX: number;
    const offsetY: number;
    const pageX: number;
    const pageY: number;
    const relatedTarget: EventDispatcher | null;
    const screenX: number;
    const screenY: number;
    const shiftKey: boolean;
    const x: number;
    const y: number;

    constructor(type:string, bubbles?:boolean,cancelable?:boolean);
    getModifierState(keyArg: string): boolean;
    initMouseEvent(typeArg: string, 
                    canBubbleArg: boolean, 
                    cancelableArg: boolean, 
                    viewArg: Window, 
                    detailArg: number, 
                    screenXArg: number, 
                    screenYArg: number, 
                    clientXArg: number, 
                    clientYArg: number, 
                    ctrlKeyArg: boolean, 
                    altKeyArg: boolean, 
                    shiftKeyArg: boolean, 
                    metaKeyArg: boolean, 
                    buttonArg: number, 
                    relatedTargetArg: EventDispatcher | null): void; 
}

/** 
* KeyboardEvent objects describe a user interaction with the keyboard; 
* each event describes a single interaction between the user and a key (or combination of a key with modifier keys) 
* on the keyboard. 
*/
@Dynamic;
declare class KeyboardEvent extends UIEvent{
    const altKey: boolean;
    const code: string;
    const ctrlKey: boolean;
    const isComposing: boolean;
    const key: string;
    const location: number;
    const metaKey: boolean;
    const repeat: boolean;
    const shiftKey: boolean;
    const DOM_KEY_LOCATION_LEFT: number;
    const DOM_KEY_LOCATION_NUMPAD: number;
    const DOM_KEY_LOCATION_RIGHT: number;
    const DOM_KEY_LOCATION_STANDARD: number;
    constructor(type:string, bubbles?:boolean,cancelable?:boolean);
    getModifierState(keyArg: string): boolean;
}

declare type TouchType =  "direct" | "stylus";

declare class Touch extends Object{
    const altitudeAngle: number;
    const azimuthAngle: number;
    const clientX: number;
    const clientY: number;
    const force: number;
    const identifier: number;
    const pageX: number;
    const pageY: number;
    const radiusX: number;
    const radiusY: number;
    const rotationAngle: number;
    const screenX: number;
    const screenY: number;
    const target: EventDispatcher;
    const touchType: TouchType;
}

declare interface TouchList {
    const length: number;
    item(index: number):Touch;
}

@Dynamic;
declare class TouchEvent extends UIEvent {
    const altKey: boolean;
    const changedTouches: TouchList;
    const ctrlKey: boolean;
    const metaKey: boolean;
    const shiftKey: boolean;
    const targetTouches: TouchList;
    const touches: TouchList;
    constructor(type:string, bubbles?:boolean,cancelable?:boolean);
}

declare interface DataTransfer extends Object{}

/** A DOM event that represents a drag and drop interaction. 
The user initiates a drag by placing a pointer device (such as a mouse) on the touch surface and then dragging 
the pointer to a new location (such as another DOM element). Applications are free to interpret a drag and 
drop interaction in an application-specific way.
 */
 @Dynamic;
declare class DragEvent extends MouseEvent {
    /**
     * Returns the DataTransfer object for the event.
     */
    const dataTransfer: DataTransfer | null;

    constructor(type:string, bubbles?:boolean,cancelable?:boolean);
}