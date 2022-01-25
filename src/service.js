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

const MODULE_PROPERTY_ALL = 15
const MODULE_PROPERTY_ACCESSOR = 1
const MODULE_PROPERTY_VAR = 2
const MODULE_PROPERTY_METHOD = 4
const MODULE_PROPERTY_CONST = 8

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

    getStackByAt(file,startAt,trys=20, both=0){
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
                }else if(item.node.start <= startAt && item.node.end >= startAt){
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
            case stack.isEnumDeclaration :
                return stack.properties;
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
                return this.getStackSpreadItems(stack.consequent).concat( this.getStackSpreadItems(stack.alternate) );
            case stack.isJSXElement :
                return [stack.openingElement].concat(stack.children);
            case stack.isJSXAttribute :
                return [stack.name,stack.value]
            case stack.isJSXExpressionContainer :
                return [stack.expression]
            case stack.isJSXOpeningElement :
                return stack.attributes || [];
            case stack.isBlockStatement  :
                return stack.body;
            case stack.isSwitchStatement  :
                return [stack.condition].concat( stack.cases )
            case stack.isSwitchCase  :
                if( stack.condition ){
                    body.push( stack.condition )
                }
                if( stack.consequent ){
                    body.push( stack.consequent )
                }
                return body;
        }
        return body;
    }

    getContainStackByAt( stack, startAt ){
        const node = stack && stack.node;
        if(node && node.start <= startAt && node.end >= startAt ){
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

    getAllModuleRefs( root , merges){
        let globals = merges || [];
        root = root || Namespace.dataset;
        root.modules.forEach( (item,name)=>{
            let kind =  0
            switch( true ){
                case item.isInterface :
                    kind = CompletionItemKind.Interface;
                    break;   
                case item.isClass :
                    kind = CompletionItemKind.Class;
                    break;    
                case item.isEnum :
                    kind = CompletionItemKind.Enum;
                    break;    
            }
            if( kind ){
                globals.push( {text:item.toString(),kind:kind, stack:item.compilation.getStackByModule(item)} )
            }
        });
        root.children.forEach( child=>{
            this.getAllModuleRefs( child, globals );
        });
        return globals;
    }

    getAllNamespaceRefs( root ){
        let globals = [];
        root = root || Namespace.dataset;
        root.children.forEach( child=>{
            globals.push( {text:child.fullName, kind:CompletionItemKind.Folder } )
            globals = globals.concat( getAllNamespaceRefs( child ) )
        });
        return globals;
    }

    getModuleProperties( typeModule, isStatic=false, ns=7 , excludes=null, mode=MODULE_PROPERTY_ALL ){
        let properties = [];
        excludes = excludes === null ? new Set() : excludes;
        if( !typeModule || !typeModule.isModule ){
            return properties;
        }
        const push=(item, kind, type)=>{
            if( item && (mode & type) === type ){
                const text = item.value();
                const key = text+kind;
                if( !excludes.has( key ) ){
                    excludes.add( key );
                    const defaultValue = item.isPropertyDefinition && item.init && item.init.isLiteral ? item.init.value() : null;
                    properties.push({text,kind,stack:item,defaultValue});
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
                        push(item.get || item.set,CompletionItemKind.Property, MODULE_PROPERTY_ACCESSOR);
                        //push(item.set,CompletionItemKind.Property);
                    }else if( item.isPropertyDefinition ){
                        push( item, CompletionItemKind.Property, item.kind ==='const' ? MODULE_PROPERTY_CONST : MODULE_PROPERTY_VAR );
                    }else{
                        push(item,CompletionItemKind.Method, MODULE_PROPERTY_METHOD );
                    }
                }
            }
        }
        if( isStatic ){
            if( typeModule.isClass ){
                every(typeModule.methods);
                properties = properties.concat( this.getModuleProperties( typeModule.compilation.getGlobalTypeById("Class"), false, 1 ^ ns , excludes, mode ) );
            }
        }else{
            every(typeModule.members);
            if( typeModule.inherit ){
                properties = properties.concat(this.getModuleProperties( typeModule.inherit, isStatic, 1 ^ ns, excludes, mode) );
            }
            if( typeModule.isDeclaratorModule ){
                typeModule.implements.forEach(impModule=>{
                    properties = properties.concat(this.getModuleProperties( impModule, isStatic, 1 ^ ns, excludes, mode) );
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
                items.push({text:module.toString(),kind:kind,stack:compilation.getStackByModule(module)})
            });
        });
        return items;
    }

    getLocalScopeRefs(context){
        if( !context || !context.isStack )return [];
        const scope   = context.scope;
        const varKeys = scope && scope.getKeys(["block","function"]).map( name=>{
            const token = scope.define(name);
            const kind = token && token.isStack && token.kind==="const" ? CompletionItemKind.Constant : CompletionItemKind.Variable;
            return {text:name,kind:kind,stack:token && token.isStack ? token : null};
        });
        const items = [];
        if( context.module && context.module.inherit ){
            const pStack = context.getParentStack( stack=>!!stack.isBlockStatement );
            if( pStack.isBlockStatement && pStack.parentStack.isFunctionExpression && pStack.parentStack.parentStack.isMethodDefinition ){
                if( !pStack.parentStack.parentStack.static){
                    items.push({text:"super", kind:CompletionItemKind.Constant});
                } 
            }
        }
        return varKeys;
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
                    return this.getModuleImportRefs(compilation).concat( this.getGlobalRefs(compilation), this.getLocalScopeRefs(context) );
                }
            }else if( triggerKind == ' ' ){
                const context = this.getProgramStackByLine(compilation.stack, startAt);
                if( context ){
                    if( context.isPackageDeclaration || context.isImportDeclaration ){
                        return this.getAllModuleRefs();
                    }else if( context.isJSXText ){
                        return [];
                    }
                    else if( context.isJSXElement ){
                        const contain = this.getContainStackByAt( context.openingElement, startAt);
                        if( !contain ){
                            return [];
                        }
                        const description = context.getSubClassDescription();
                        const excludes = new Set();
                        const attributes = context.openingElement.attributes || [];
                        attributes.forEach(item=>{
                            if( item.isMemberProperty){
                                if( item.name.isJSXNamespacedName ){
                                    excludes.add( item.name.name.value() );
                                }else{
                                    excludes.add( item.name.value() );
                                }
                            }
                        });
                        const xmlnsDefault = Object.keys( this.compiler.options.jsx.xmlns.default ).map( name=>{
                            return {text:name,kind:CompletionItemKind.Struct}
                        });
                        const properties = this.getModuleProperties(description, false, 4, excludes,MODULE_PROPERTY_VAR | MODULE_PROPERTY_ACCESSOR);
                        properties.forEach( item=>{ 
                            if( item.defaultValue ){
                                item.insertText = `${item.text} = "${item.defaultValue}"`
                            }else{
                                item.insertText = `${item.text} = ""`
                            }
                        });
                        return xmlnsDefault.concat( properties );

                    } else if( context.isJSXAttribute ){

                        if( context.isAttributeXmlns ){
                            const xmlnsDefault = Object.keys( this.compiler.options.jsx.xmlns.sections ).map( name=>{
                                return {text:name,kind:CompletionItemKind.Struct}
                            });
                            return xmlnsDefault.concat( this.getAllNamespaceRefs() );
                        }

                    }else if(context.parentStack && context.parentStack.isJSXAttribute ){

                       if( context.parentStack.isAttributeXmlns ){

                            const xmlnsDefault = Object.keys( this.compiler.options.jsx.xmlns.sections ).map( name=>{
                                return {text:name,kind:CompletionItemKind.Struct}
                            });
                            return xmlnsDefault.concat( this.getAllNamespaceRefs() );

                       }else if( context.parentStack.value === context ){

                            const attrDesc = context.parentStack.parserAttributeValueStack( context.parentStack.name.value() );
                            if( attrDesc ){
                                const attrType = attrDesc.type();
                                if( attrType.isUnionType ){
                                    return attrType.elements.map( item=>{
                                        return {text:item.type().toString().replace(/[\'\"]+/g,''),kind:CompletionItemKind.Text}
                                    });
                                }else if( attrType.isLiteralType ){
                                    return attrType.toString().replace(/[\'\"]+/g,'');
                                }
                            }
                            return []
                            
                       }

                    }
                    else{

                        const pStack = context.getParentStack( stack=>!!(stack.isMethodDefinition || stack.isFunctionExpression || stack.isBlockStatement || stack.isSwitchCase) );
                        if( pStack ){
                            return ['var','const','function'].map( (name)=>{
                                return {text:name,kind:CompletionItemKind.Keyword}
                            }).concat( this.getGlobalRefs(), this.getLocalScopeRefs(context) )
                        }
                    }
                }

            }else if( triggerKind == '@' ){

                return this.compiler.options.annotations.map( (name)=>{
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
                    return context;
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
            }else if( triggerKind.charCodeAt(0) === 10 ){
                const context = this.getProgramStackByLine(compilation.stack, startAt);
                if( context ){

                    if( context.isPackageDeclaration ){
                        return ["import","class","interface","implements",'public','enum','static'].map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        }).concat(this.compiler.options.annotations.map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        }));
                    }else if( context.isClassDeclaration ){
                        return ['public','protected','private','static','var','const'].map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        }).concat(this.compiler.options.annotations.map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        }));
                    }else if( context.isInterfaceDeclaration || context.isEnumDeclaration){
                        return ['public','var','const'].map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        }).concat(this.compiler.options.annotations.map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        }));
                    }else {
                        const pStack = context.getParentStack( stack=>!!(stack.isMethodDefinition || stack.isFunctionExpression || stack.isBlockStatement || stack.isSwitchCase) );
                        if( pStack ){
                            return ['var','const','function'].map( (name)=>{
                                return {text:name,kind:CompletionItemKind.Keyword}
                            }).concat( this.getGlobalRefs(), this.getLocalScopeRefs(context) )
                        }
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
       const items = this.getCompletionItems(file, lineText, startAt-(triggerKind ? triggerKind.length : 0),triggerKind);
       return items; 
    }

    check(file, source){
        try{
            const compilation = this.compiler.createCompilation( file );
            if( !compilation.isDescriptionType ){
                if( !compilation.isValid(source) ){
                    const ast = compilation.previewSourceAst( source );
                    if( ast ){
                        compilation.clear();
                        compilation.createStack(source, ast);
                        compilation.source = source;
                    }
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
                const result = stack.definition();
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
                const result = stack.definition();
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