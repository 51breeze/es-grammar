const Lib =  require("./lib");
const {
    Compiler,
    Namespace,
    Parser,
    Utils
} = Lib;
const parseExpressionAt = Parser.Parser.parseExpressionAt;
const defaultOptions = {
    service:true,
    debug:true,
    autoLoadDescribeFile:false,
    parser:{
        locations:true
    },
    diagnose:true
};
const CompletionItemKind ={
    Text:0,
    Method:1,
    Function:2,
    Constructor:3,
    Field:4,
    Variable:5,
    Class:6,
    Interface:7,
    Module:8,
    Property:9,
    Unit:10,
    Value:11,
    Enum:12,
    Keyword:13,
    Snippet:14,
    Color:15,
    Reference:17,
    File:16,
    Folder:18,
    EnumMember:19,
    Constant:20,
    Struct:21,
    Event:22,
    Operator:23,
    TypeParameter:24,
    User:25,
    Issue:26,
};

class Service{
    constructor(options){
        if( options ){
            options =  Object.assign({}, defaultOptions, options);
        }else{
            options =  Object.assign({}, defaultOptions);
        }
        this._options =  options;
    }
    set options( value ){
        if(value && typeof value ==="object"){
            this._options = Object.assign(this._options,value);
            if( this._compiler ){
                Object.assign(this._compiler.options, this._options );
            }
        }
    }
    get options(){
        return this._options;
    }
    get compiler(){
        if( this._compiler )return this._compiler;
        this._compiler = new Compiler( this.options );
        this._compiler.initialize();
        return this._compiler;
    }

    getCompilation(file){
        return this.compiler.createCompilation( file );
    }

    parser(file){
        const compilation = this.getCompilation( file );
        compilation.parser();
        compilation.checker();
        return compilation;
    }

    comments(result){
        if( result && result.comments ){
            result.comments.forEach( item=>{
                if( item.type=="Block" ){
                    item.value = item.value.split(/\r\n/g).map( val=>val.replace(/^(\s+|\t+)?\*?/g,"") ).filter( val=>!!val).join("\r\n");
                }else{
                    //item.value = item.value.split(/^(\s+|\t+)?([\/]+)/g);
                }
            });
        }
        return result;
    }

    getStackByAt(file,startAt,trys=3, both=0){
       const compilation = this.parser(file);
       return compilation.getStackByAt(startAt, trys, both);;
    }

    getProgramStackByLine(stack, startAt ){
        const body = stack && stack.body || [];
        for(let index=0; index<body.length; index++){
            const item = body[index];
            if( item.isPackageDeclaration ||
                item.isDeclaratorDeclaration ||
                item.isClassDeclaration ||
                item.isInterfaceDeclaration
            ){
                const result = this.getProgramStackByLine(item,startAt);
                if( result ){
                    return result;
                }else if(item.node.start < startAt && item.node.end > startAt){
                    return item;
                }
            }else{
                const result = this.getContainStackByAt(item, startAt);
                if( result ){
                    return result;
                }
            }
        }
        return null;
    }

    getStackSpreadItems(stack){
        let body = [];
        if( !stack )return body;
        switch( true ){
            case stack.isFunctionExpression :
            case stack.isArrowFunctionExpression :
            case stack.isFunctionDeclaration :
            case stack.isMethodDefinition :
               return this.getStackSpreadItems(stack.body);
            case stack.isPackageDeclaration :
            case stack.isClassDeclaration :
            case stack.isInterfaceDeclaration :
                body = stack.body;
            break;
            case stack.isPropertyDefinition :
            case stack.isVariableDeclaration :
                body = stack.declarations;
            break;
            case stack.isAssignmentExpression :
                body = [stack.right];
            break;
            case stack.isVariableDeclarator :
                body = [stack.init];
            break;
            case stack.isArrayExpression :
                body = stack.elements;
            break;
            case stack.isObjectExpression :
                body = stack.properties.map( prop=>prop.init );
            break;
            case stack.isBinaryExpression :
                body = [stack.left, stack.right];
            break;
            case stack.isAwaitExpression :
            case stack.isReturnStatement :
                body = [stack.argument];
            break;
            case stack.isExpressionStatement :
            case stack.isParenthesizedExpression :
                body = [stack.expression];
            break;
            case stack.isMemberExpression :
                body = [stack.object,stack.property];
            break;
            case stack.isImportDeclaration :
                body = [stack.specifiers];
            break;
            case stack.isNewExpression :
            case stack.isCallExpression :
                body = [stack.callee].concat( stack.arguments );
            break;
            case stack.isIfStatement :
            case stack.isWhenStatement :
                return this.getStackSpreadItems(stack.consequent) || this.getStackSpreadItems(stack.alternate);
            default:
                body = stack.isBlockStatement ? stack.body : [];
        }
        return body;
    }

    getContainStackByAt( stack, startAt ){
        const node = stack && stack.node;
        if(node && node.start < startAt && node.end > startAt ){
            const body = this.getStackSpreadItems(stack);
            let len = body.length;
            while( len > 0 ){
                const expr = body[ --len ];
                const result = this.getContainStackByAt(expr, startAt);
                if( result ){
                    return result;
                }
            }
            return stack;
        }
        return null;
    }

    getCanInsertExpression(stack){
        switch(true){
            case stack.isCallExpression :
                return stack;
            case stack.isBinaryExpression :
                return stack.right;     
            case stack.isAwaitExpression :
                return stack.argument;
            case stack.isVariableDeclaration :
                const item = stack.declarations[ stack.declarations.length-1 ];
                return item && item.init;
        }

        let express =  stack.parentStack;
        while( express ){
            if( express.isCallExpression ){
                if( express.arguments.indexOf(stack) >= 0 ){
                    return stack;
                }
                return express;
            }else if( express.isMemberExpression ){
                if( express.property === stack ){
                    const desc = express.description();
                    if( desc && desc.isMethodGetterDefinition || desc.isPropertyDefinition){
                        return express;
                    }
                    express = express.parentStack;
                }else if( express.object !== stack){
                    return express;
                }else{
                    return stack;
                }
            }else{
                return stack;
            }
        }
        return stack;
    }

    getLastStackByAt(stack, startAt){
        if( !stack )return null;
        const node = stack.node;
        if( !(stack.isVariableDeclarator || stack.isAssignmentExpression || stack.isExpressionStatement || stack.isBinaryExpression) ){
            if(node && node.end+1 == startAt ){
                return stack;
            }
        }
        const body = this.getStackSpreadItems(stack);
        let len = body.length;
        while( len > 0 ){
            const expr = body[ --len ];
            const result = this.getLastStackByAt(expr, startAt);
            if( result ){
                return result;
            }
        }
        return null;
    }

    getGlobalRefs(compilation){
        const globals = [];
        Namespace.dataset.modules.forEach( (item,name)=>{
            let kind =  CompletionItemKind.Field;
            switch( true ){
                case item.isDeclaratorFunction:
                    kind = CompletionItemKind.Function;
                break;
                case item.isInterface :
                    kind = CompletionItemKind.Interface;
                    break;   
                case item.isClass :
                    kind = CompletionItemKind.Class;
                    break;    
                case item.isAliasType :
                case item.isAnyType :
                case item.isNullableType :
                case item.isVoidType :
                    return;
                case item.isDeclaratorVariable :
                    kind = item.kind ==="const" ? CompletionItemKind.Constant : CompletionItemKind.Variable;
                    break;
            }
            globals.push( {text:name,kind:kind} )
        });
        return globals;
    }

    getModuleProperties( typeModule, isStatic=false, ns=7 , excludes=null ){
        let properties = [];
        excludes = excludes === null ? new Set() : excludes;
        if( !typeModule || !typeModule.isModule ){
            return properties;
        }
        const push=(item, kind)=>{
            if( item ){
                const text = item.value();
                const key = text+kind;
                if( !excludes.has( key ) ){
                    excludes.add( key );
                    properties.push({text,kind,stack:item});
                }
            }
        }
        const modifier = {
            "public":4,
            "protected":2,
            "private":1,
        }
        const every=(target)=>{
            if( !target )return;
            for(const name in target){
                const item = target[name];
                const power = modifier[ item.modifier ? item.modifier.value() : "public" ] || 0;
                if( (power | ns) === ns ){
                    if( item.isAccessor ){
                        push(item.get || item.set,CompletionItemKind.Property);
                        //push(item.set,CompletionItemKind.Property);
                    }else if( item.isPropertyDefinition ){
                        push( item, CompletionItemKind.Property);
                    }else{
                        push(item,CompletionItemKind.Method);
                    }
                }
            }
        }
        if( isStatic ){
            if( typeModule.isClass ){
                every(typeModule.methods);
                properties = properties.concat( this.getModuleProperties( typeModule.compilation.getGlobalTypeById("Class"), false, 1 ^ ns , excludes ) );
            }
        }else{
            every(typeModule.members);
            if( typeModule.inherit ){
                properties = properties.concat(this.getModuleProperties( typeModule.inherit, isStatic, 1 ^ ns, excludes) );
            }
            if( typeModule.isDeclaratorModule ){
                typeModule.implements.forEach(impModule=>{
                    properties = properties.concat(this.getModuleProperties( impModule, isStatic, 1 ^ ns, excludes) );
                });
            }
        }
        return properties;
    }

    getModuleImportRefs(compilation){
        const items = [];
        compilation.modules.forEach( (module,key)=>{
            module.imports.forEach( (module,name)=>{
                let kind = CompletionItemKind.Reference;
                if( module.isClass ){
                    kind = CompletionItemKind.Class;
                }else if(module.isInterface){
                    kind = CompletionItemKind.Interface;
                }else if(module.isEnum){
                    kind = CompletionItemKind.Enum;
                }
                items.push({text:name,kind:kind})
            });
        });
        return items;
    }

    getCompletionItems(file, lineText, startAt, triggerKind){

        try{
            const compilation = this.parser(file);
            if( !triggerKind ){
               const context = this.getProgramStackByLine(compilation.stack, startAt);
               if( context ){
                    if( context.isPackageDeclaration ){
                        return ["import","class","interface","implements",'public','enum'].map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        });
                    }else if( context.isClassDeclaration || context.isInterfaceDeclaration){
                        return ["public","protected","private","static"].map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        });
                    }
                    const parentStack= context.getParentStack( item=>!!item.isFunctionExpression );
                    const methodStack = parentStack && parentStack.parentStack;
                    const isMethod = methodStack && methodStack.isMethodDefinition;
                    const scope   = context.scope;
                    const varKeys = scope.getKeys(["block","function"]).map( name=>{
                        const token = scope.define(name);
                        const kind = token && token.kind==="const" ? CompletionItemKind.Constant : CompletionItemKind.Variable;
                        return {text:name,kind:kind}
                    });
                    const items = [];
                    if( isMethod && !methodStack.static ){
                        items.push({text:"super", kind:CompletionItemKind.Constant});
                    }
                    return varKeys.concat( this.getModuleImportRefs(compilation), this.getGlobalRefs(compilation), items );
                }
            }else if( triggerKind == ' ' ){
                const context = this.getProgramStackByLine(compilation.stack, startAt);
                if( context ){
                    if( context.isPackageDeclaration || context.isImportDeclaration ){
                        return compilation.readSibling(true).map( item=>{
                            if( item.folder ){
                                return {text:item.name,kind:CompletionItemKind.Folder}
                            }
                            return {text:item.name,kind:CompletionItemKind.Module}
                        });
                    }
                }

            }else if( triggerKind == '@' ){

                return ["override","router"].map( (name)=>{
                    return {text:name,kind:CompletionItemKind.Keyword}
                });

            }else if(triggerKind=='.'){
               
                const getStack = ()=>{
                    const context = this.getProgramStackByLine(compilation.stack, startAt);
                    let stack =  this.getLastStackByAt( context, startAt );
                   
                    if( stack ){
                        stack = this.getCanInsertExpression( stack );
                        const type = stack.type();
                        if(stack.isLiteral && !["string","regexp"].includes( type.toString().toLowerCase() ) ){
                            return null;
                        }
                        if( stack.isIdentifier && type.isModule && type.isInterface){
                            return null;
                        }
                        if( stack.isObjectExpression ){
                            return null;
                        }
                        if( stack.isIdentifier || 
                            stack.isLiteral    ||
                            stack.isMemberExpression || 
                            stack.isCallExpression || 
                            stack.isThisExpression || 
                            stack.isSuperExpression || 
                            stack.isArrayExpression
                        ){
                            return stack;
                        }
                    }

                    lineText = lineText.slice(0,-1);
                    if( context && lineText ){
                        lineText = lineText.replace(/^(import)\s+/,'');
                        try{
                            const parentStack= context.getParentStack( item=>!!item.isFunctionExpression );
                            const methodStack = parentStack && parentStack.parentStack;
                            const isMethod = methodStack && methodStack.isMethodDefinition;
                            if( lineText ==="super" ){
                                if( methodStack.module.inherit && !methodStack.static ){
                                    return {type(){return methodStack.module.inherit}};
                                }
                                return null;
                            }
                            const options = {...this.options};
                            if( isMethod ){
                                options.isMethod = true;
                                options.isAsync = false;
                                options.generator = false;
                                options.allowDirectSuper = methodStack.isConstructor;
                            }
                            const node = parseExpressionAt(lineText, 0, options);
                            const nodeStack = Utils.createStack(compilation,node,context.scope,context.node);
                            nodeStack.parentNode = context.node;
                            nodeStack.parentStack = context;
                            nodeStack.namespace = context.namespace;
                            nodeStack.module = context.module;
                            return nodeStack;
                        }catch(e){
                            if( this.options.debug ){
                                console.log( e )
                            }
                        }
                    }
                    return null;
                }
               
                const stack = getStack();
                if( stack ){

                    const classModule = stack.module;
                    const description = stack.description();
                    const inference = stack.inference(stack,true);
                    let type = inference( stack.type() );
                    if( type.isGenericType && type.hasConstraint ){
                        type = type.inherit;
                    }

                    const getPower = ( type )=>{
                        if( type.isModule && (type.isClass || type.isEnum) ){
                            let parent = classModule.inherit;
                            while( parent && type !== parent ){
                                parent = parent.inherit;
                            }
                            return classModule === type ? 7 : (parent === type ? 6 : 4);
                        }
                        return 4;
                    }

                    switch( true ){
                        case type.isLiteralObjectType :
                            return Array.from(type.properties.keys()).map(name=>{
                                return {text:name,kind:CompletionItemKind.Property}
                            }).concat( this.getModuleProperties( Utils.getOriginType(type) , false, 4) );
                        case type.isModule :
                        case type.isClassGenericType :
                            if( type.isInterface ){
                                return this.getModuleProperties(type, false, 4);
                            }else if( type.isClassType ){
                                const ns = getPower( type.types[0] );
                                return this.getModuleProperties(type.types[0] , true, ns);
                            }else{
                                const orign = Utils.getOriginType(type);
                                const ns = getPower( orign );
                                return this.getModuleProperties( orign , description===type, ns);
                            }
                        case type.isNamespace :
                            return compilation.readSibling(true, type.toString() ).map( item=>{
                                if( item.folder ){
                                    return {text:item.name,kind:CompletionItemKind.Folder}
                                }
                                return {text:item.name,kind:CompletionItemKind.Module}
                            });
                        default :
                            const orign = Utils.getOriginType(type);
                            const ns = getPower( orign );
                            return this.getModuleProperties( orign , false, ns);
                    }
                }
            }
        }catch(e){
            if( this.options.debug ){
                console.log( e )
            }
        }
        return [];
    }

    completion(file, lineText, startAt, line, character, triggerKind){
       const items = this.getCompletionItems(file, lineText, startAt,triggerKind);
       return items; 
    }

    check(file, source){
        try{
            const compilation = this.compiler.createCompilation( file );
            if( !compilation.isDescriptionType ){
                if( !compilation.isValid(source) ){
                    compilation.clear();
                    compilation.createStack( source );
                }
                if( compilation.stack ){
                    compilation.stack.parser();
                    compilation.stack.checker();
                }
            }else{
                compilation.parser();
                compilation.checker();
            }
            return compilation.errors;
        }catch(e){
            if( this.options.debug ){
                console.log( e )
            }
            return [];
        }
    }

    hover(file, startAt, line, character, word){
        try{
            const stack = this.getStackByAt(file, startAt, 3, -1) 
            if( stack ){
                const result = stack.definition(true);
                if( result  ){
                    this.comments(result);
                }
                return result;
            }
        }catch(e){
            if( this.options.debug ){
                console.log( e )
            }
        }
        return null;
    }

    definition(file, startAt, line, character, word){
        try{
            const stack = this.getStackByAt(file, startAt, 3, -1) 
            if( stack ){
                const result = stack.definition(true);
                if( result && !result.location  ){
                    return null;
                }
                return result;
            }
        }catch(e){
            if( this.options.debug ){
                console.log( e )
            }
        }
        return null;
    }

    clear(){
        console.log("service stop...")
    }
}

module.exports = Service;