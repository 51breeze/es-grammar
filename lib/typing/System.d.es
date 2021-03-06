@Reference('globals.d.es');
declare System{
    static is(left:any,right:Class|Interface):boolean;
    static isClass(target:any):boolean;
    static isInterface(target:any):boolean;
    static isEnum(target:any):boolean;
    static isFunction(target:any):boolean;
    static isArray(target:any):boolean;
    static isObject(target:any):boolean;
    static isString(target:any):boolean;
    static isScalar(target:any):boolean;
    static isNumber(target:any):boolean;
    static isBoolean(target:any):boolean;
    static toArray<T=any>(target:object):T[];
    static getDefinitionByName(name:string):Class;
    static hasClass(name:string):boolean;
    static getQualifiedClassName( target:Class ):string;
    static getQualifiedObjectName( target:object ):string;
    static getQualifiedSuperClassName(target:object):string | null;
}