
const path =  require("path");
const fs =  require("fs");
const Compiler = require("../../easescript2/lib/core/Compiler");
const Namespace = require("../../easescript2/lib/core/Namespace");
const Parser = require("../../easescript2/lib/core/Parser");
const Utils = require("../../easescript2/lib/core/Utils");
const parseExpressionAt = Parser.Parser.parseExpressionAt;
const defaultOptions = {
    service:true,
    debug: process.env.NODE_ENV === 'development',
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
        options.globalTypes=[ path.join(__dirname,'types') ];
        this._options =  options;
        const workspaceFolders = options.cwd;
        try{
            const compiler = new Compiler( options );
            const types = compiler.scanTypings(workspaceFolders);
            if(types){
                compiler.loadTypes( types );
            }
            this._types = types;
            this._compiler = compiler;
        }catch(e){
            console.error(e);
        }
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
        return this._compiler;
    }

    onDidChangeWorkspace( workspaceFolders ){
        const compiler = this.compiler;
        const types = compiler.scanTypings(workspaceFolders);
        this._types.forEach( file=>{
            if( !types.includes(file) ){
                compiler.removeCompilation(file);
            }
        });
        this._types = types;
        compiler.loadTypes( types );
    }

    getCompilation(file){
        return this.compiler.createCompilation( file );
    }

    parser(file){
        const compilation = this.getCompilation( file );
        compilation.parser();
        return compilation;
    }

    comments(result){
        if( result && result.comments ){
            return result.comments.filter(item=>item.type=="Block").map( item=>{
                return item.value.split(/\r\n/g).map( val=>val.replace(/^(\s+|\t+)?\*?/g,"") ).filter( val=>!!val);
            }).flat();
        }
        return null;
    }

    getStackByAt(file,startAt,tryNum=20, both=0){
       const compilation = this.parser(file);
       return compilation.getStackByAt(startAt, tryNum, both);
    }

    getProgramStackByLine(stack, startAt ){
        const result = this.getContainStackByAt(stack, startAt);
        if( result ){
            return result;
        }
        return null;
    }

    getContainStackByAt( stack, startAt ){
        const node = stack && stack.node;
        const inRange = node && node.start <= startAt && node.end >= startAt;
        if( inRange || stack.isDeclarator ){
            const body = stack.childrenStack
            let len = body && body.length;
            while( len > 0 ){
                const childStack = body[ --len ];
                const result = childStack ? this.getContainStackByAt(childStack, startAt) : null;
                if( result ){
                    return result;
                }
            }
            if(inRange)return stack;
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
                globals.push( {text:item.namespace.getChain().concat( item.id ).join("."),kind:kind, stack:item.compilation.getStackByModule(item)} )
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
                properties = properties.concat( this.getModuleProperties( typeModule.inherit, isStatic, 1 ^ ns, excludes, mode) );
            }
            if( typeModule ){
                typeModule.implements.forEach(impModule=>{
                    properties = properties.concat( this.getModuleProperties( impModule, isStatic, 1 ^ ns, excludes, mode) );
                });
            }
        }
        return properties;
    }

    getModuleImportRefs(compilation,context){
        const items = [];
        compilation.modules.forEach( (module,key)=>{
            if( !context || context === module ){
                module.imports.forEach( (module,name)=>{
                    let kind = CompletionItemKind.Reference;
                    if( module.isClass ){
                        kind = CompletionItemKind.Class;
                    }else if(module.isInterface){
                        kind = CompletionItemKind.Interface;
                    }else if(module.isEnum){
                        kind = CompletionItemKind.Enum;
                    }
                    items.push({text:module.getName(),kind:kind,stack:compilation.getStackByModule(module)})
                });
            }
        });
        return items;
    }

    getLocalScopeRefs(context){
        if( !context || !context.isStack )return [];
        const localScopeRefs = this._localScopeRefs || (this._localScopeRefs = new Map());
        const scope   = context.scope;
        if( localScopeRefs.has(scope) ){
            return localScopeRefs.get( scope );
        }
        const varKeys = []
        scope && scope.getKeys(["block","function"]).forEach( name=>{
            const token = scope.define(name);
            if( token !== scope && token.isStack ){
                const kind = token && token.isStack && token.kind==="const" ? CompletionItemKind.Constant : CompletionItemKind.Variable;
                varKeys.push({text:name,kind:kind,stack:token && token.isStack ? token : null});
            }
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
        localScopeRefs.set(scope, varKeys);
        return varKeys;
    }

    getStatementKeywords(){
        if( this._keywords ){
            return this._keywords;
        }
        this._keywords = [
            'class','extends','implements','super','this','return',
            'continue','function','break','case','default','switch',
            'if','else','else if','for','try','catch','finally',
            'do','while','var','const','let','throw','delete','null',
            'false','true','NaN'
        ].map( name=>{
            return {text:name, kind:CompletionItemKind.Keyword}
        });
        return this._keywords;
    }

    getDotCompletionItems(compilation, lineText, startAt){

        const getStack = ()=>{
            let context = this.getProgramStackByLine(compilation.stack, startAt);
            if( context && context.parentStack && context.parentStack.isMemberExpression ){
                if( context.parentStack.object === context ){
                    context = context.parentStack.object
                }else{
                    context = context.parentStack;
                }
            }
            return context; 
        }
       
        const stack = getStack();
        if( stack ){
            const classModule = stack.module;
            let description = null;
            let type = null;
            if( stack.isStack ){
                description = stack.description();
                type = stack.type();
                if(type && type.isGenericType && type.hasConstraint ){
                    type = type.inherit;
                }
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
                    return Array.from( type.children.values() ).map( item=>{
                        return {text:item.identifier,kind:CompletionItemKind.Folder}
                    }).concat(Array.from( type.modules.values() ).map( item=>{
                        return {text:item.id,kind:CompletionItemKind.Module}
                    }));
                default :
                    const orign = Utils.getOriginType(type);
                    const ns = getPower( orign );
                    return this.getModuleProperties( orign , false, ns);
            }
        }
    }

    inPosition(stack, startAt){
        return stack.node.start < startAt && stack.node.end > startAt;
    }

    isWebComponent(classModule){
        while( classModule && classModule.isModule ){
            const stack = classModule.compilation.getStackByModule( classModule );
            if( stack && stack.annotations  && Array.isArray(stack.annotations) ){
                if( stack.annotations.some( item=>item.name.toLowerCase() === 'webcomponent') ){
                    return true;
                }
            }
            classModule=classModule.inherit;
        }
        return false;
    }

    searchingUncloseTag(document,startAt){
        const text = document.getText();
        //const context = this.getProgramStackByLine(compilation.stack, startAt);
        //const endAt = context && context.parentStack ? context.parentStack.node.start : 0;
        const endAt = 0;
        const tags = [];
        const results = [];
        let posAt = startAt;
        let tagName = '';
        let skip = false;
        while( posAt > endAt ){
            posAt--;
            const code = text.charCodeAt(posAt);
            if( code===34 || code===39 || code===96 ){
                let backslash = 0;
                while( text.charCodeAt(posAt-1) ===92 ){
                    posAt--;
                    backslash++;
                }
                if( backslash % 2 !== 0 ){
                    skip = !skip;
                    continue;
                }
            }
            
            if( skip ){
                continue;
            }

            if( code===62 ){
                var token = {tag:60,pos:posAt,single:false,close:false};
                tags.push(token);
                if( text.charCodeAt(posAt-1) === 47 ){
                    posAt--;
                    token.close = true;
                    token.single = true;
                }
            }else if( tags.length > 0 ){
                if( code ===47 && text.charCodeAt(posAt-1) === 60 ){
                    const tag = tags[ tags.length-1 ];
                    tag.close = true;
                    tag.start = posAt;
                    tag.name = tagName;
                    posAt--;
                }else if( tags[ tags.length-1 ].tag === code ){
                    const startTag = tags.pop();
                    if( !startTag.single ){
                        const endTag = tags.pop();
                        startTag.start = posAt+1;
                        startTag.name = tagName;
                        if( !(endTag && endTag.close) || tagName !== endTag.name ){
                            results.push( startTag );
                            break;
                        }
                    }
                }
            }
            if( (code>=65 && code <= 90) || (code>=97 && code <= 122) || code===58 || code===46){
                tagName =text[posAt] + tagName;
            }else{
                tagName = '';
            }
        }
        return results;
    }

    getAttrDirectivesItems( jsxElement ){
        let xmlns = jsxElement ? jsxElement.jsxRootElement.xmlns : [];
        let options = this.compiler.options;
        const resolveXmlns = {};
        xmlns.forEach( attr=>{
            const ns = attr.name.value();
            const value = attr.value.value();
            resolveXmlns[ value ]=ns;
        });
        for(var keyName in options.jsx.xmlns.default ){
            var ns = options.jsx.xmlns.default[keyName];
            if( !resolveXmlns[ns] ){
                resolveXmlns[ ns ] = keyName;
            }
        }
        const items = [];
        for( var ns in resolveXmlns ){
            const sections = options.jsx.xmlns.sections[ ns ];
            if( sections ){
                let def = resolveXmlns[ns];
                sections.forEach( item=>{
                    if(item=='*')item= 'name';
                    let text = `${def}:${item}=""`;
                    if( item ==='for'){
                        text = `${def}:${item}="(item,key) in data"`
                    }else if( item==='each' ){
                        text = `${def}:${item}="item of data"`
                    }
                    items.push({
                        text:`${def}:${item}`,
                        insertText:text,
                        kind:CompletionItemKind.Struct
                    });
                });
            }
        }
        return items;
    }

    getSpaceCompletionItems(compilation, lineText, startAt){
        let context = this.getProgramStackByLine(compilation.stack, startAt);
        if( !context )return [];
        if( (context.isJSXExpressionContainer || 
            (context.isLiteral && context.parentStack && context.parentStack.isJSXAttribute)) &&
            !this.inPosition(context,startAt) ){
            context = context.parentStack.parentStack;
        }

        if( context.isJSXIdentifier ){
            if( context.parentStack.isJSXNamespacedName ){
                context = context.parentStack.parentStack
            }
        }

        if( context.isJSXAttribute && context.parentStack.isJSXOpeningElement && !this.inPosition(context,startAt) ){
            context = context.parentStack;
        }

        if( context.isPackageDeclaration || context.isProgram ){
            if( /^(import)\s/.test(lineText) ){
                return this.getAllModuleRefs();
            }
        }else if( context.isJSXOpeningElement && context.parentStack.isJSXElement && context.parentStack.isComponent ){

            context = context.parentStack;
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

            const xmlnsDefault = this.getAttrDirectivesItems( context.jsxElement )

            const properties = this.getModuleProperties(description, false, 4, excludes,MODULE_PROPERTY_VAR | MODULE_PROPERTY_ACCESSOR);
            properties.forEach( item=>{ 
                if( item.defaultValue ){
                    item.insertText = `${item.text} = "${item.defaultValue}"`
                }else{
                    item.insertText = `${item.text} = ""`
                    let startAt = item.insertText.length-1;
                    let endAt;
                    item.selection = {startAt,endAt};
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
        }else if( context.parentStack && context.parentStack.isJSXAttribute ){

            if( context.parentStack.isAttributeXmlns ){
                const xmlnsDefault = Object.keys( this.compiler.options.jsx.xmlns.sections ).map( name=>{
                    return {text:name,kind:CompletionItemKind.Struct}
                });
                return xmlnsDefault.concat( this.getAllNamespaceRefs() );
            }else if( context.parentStack.value === context ){

                if( context.parentStack.jsxElement.isComponent ){
                    const description = context.parentStack.jsxElement.getSubClassDescription();
                    const attrDesc = context.parentStack.getAttributeDescription( description );
                    if( attrDesc ){
                        const attrType = attrDesc.type();
                        if( attrType.isUnionType ){
                            return attrType.elements.map( item=>{
                                return {
                                    text:item.type().toString().replace(/[\'\"]+/g,''),
                                    kind:CompletionItemKind.Text,
                                    replace:{posAt:-1}
                                }
                            });
                        }else if( attrType.isLiteralType ){
                            return [
                                {
                                   text:attrType.toString().replace(/[\'\"]+/g,''),
                                   kind:CompletionItemKind.Text,
                                   replace:{posAt:-1}
                                }
                            ]
                        }
                    }
                }
            }
        }
        else{
           
        }
        return []
        
    }

    getStartTagCompletionItems(compilation, lineText, startAt){

        let context = this.getProgramStackByLine(compilation.stack, startAt);
        if( !(context && context.module) || !this.isWebComponent(context.module) ){
            return [];
        }

        const importRefs = this.getModuleImportRefs(compilation).filter( item=>{
           this.isWebComponent(item.stack.module)
        })

        let jsxElement = context.jsxElement;
        let parent = context;
        while( !jsxElement && parent.parentStack){
            parent = parent.parentStack;
            jsxElement = parent.jsxElement;
        }

        const components = new Map();
        const resolveXmlns = {};
        let xmlns = jsxElement ? jsxElement.jsxRootElement.xmlns : [];
        if( xmlns && xmlns.length > 0 ){

            const push=(ns, module)=>{
                let data = components.get(ns);
                if( !data ){
                    components.set(ns,data=new Set());
                }
                data.add( module );
            }

            const getModule=(ns,object)=>{
                if( object instanceof Namespace){
                    object.modules.forEach( value=>{
                        if( this.isWebComponent(value) ){
                            push(ns, value);
                        } 
                    })
                    object.children.forEach( value=>{
                        getModule(ns,value)
                    })
                }else if( object.isModule && this.isWebComponent(object) ){
                    push(ns, object)
                }
            }
            const sections = compilation.compiler.options.jsx.xmlns.sections;
            xmlns.forEach( attr=>{
                const ns = attr.name.value();
                const value = attr.value.value();
                if( value==='@directives'){
                    const directives = sections[ value ];
                    if( directives ){
                        resolveXmlns[ ns ] = value;
                        directives.forEach( item=>{
                            push(ns, item);
                        })
                    }
                }

                const object = Namespace.fetch( value );
                if( object ){
                    getModule( ns , object)
                }
            });
        }

        components.forEach( (value,ns)=>{
            value.forEach( module=>{
                if( resolveXmlns[ ns ] ==="@directives"){
                    let text = module;
                    let insertText = '';
                    if( text==='if' || text==='elseif' || text==='show'){
                        insertText = `${ns}:${text} condition=""></${ns}:${text}>`;
                    }
                    else if( text==='else' ){
                        insertText = `${ns}:${text}></${ns}:${text}>`;
                    }
                    else if( text==='for' || text==='each' ){
                        insertText = `${ns}:${text} name="" item="item" key="key"></${ns}:${text}>`;
                    }else if( text==='each' ){
                        insertText = `${ns}:${text} name="" item="item" key="key"></${ns}:${text}>`;
                    }
                    if( insertText ){
                        importRefs.push({
                            text:text,
                            kind:CompletionItemKind.Struct,
                            insertText:insertText,
                        });
                    }

                }else{
                    importRefs.push({
                        text:module.getName(),
                        kind:CompletionItemKind.Class,
                        insertText:`${ns}:${module.id}></${ns}:${module.id}>`,
                        stack:compilation.getStackByModule(module)
                    });
                }
            })
        });

        return  importRefs;

    }

    getCloseTagCompletionItems(compilation, lineText, startAt, document){
        const results = this.searchingUncloseTag(document, startAt);
        return results.map( (item)=>{
            return {
                text:item.name,
                kind:CompletionItemKind.Snippet,
                insertText:`${item.name}>`
            }
        });
    }


    getCompletionItems(file, lineText, startAt, triggerKind, document){
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
                        return ["public","protected","private","static","implements","extends"].map( (name)=>{
                            return {text:name,kind:CompletionItemKind.Keyword}
                        });
                    }
                   
                    return this.getModuleImportRefs(compilation, context.module).concat( this.getGlobalRefs(compilation), this.getLocalScopeRefs(context), this.getStatementKeywords() );
                }
            }else if( triggerKind == ' ' ){
                return this.getSpaceCompletionItems( compilation, lineText, startAt )
            }else if( triggerKind == '@' ){
                return this.compiler.options.annotations.map( (name)=>{
                    return {text:name,kind:CompletionItemKind.Keyword}
                });
            }else if(triggerKind=='.'){
                return this.getDotCompletionItems(compilation, lineText, startAt);
            }else if( triggerKind.charCodeAt(0) === 60 ){
                return this.getStartTagCompletionItems(compilation, lineText, startAt )
            }else if( triggerKind.charCodeAt(0) === 62 ){
                //return this.getStartTagCompletionItems(compilation, lineText, startAt )
            }else if( triggerKind.charCodeAt(0) === 47 ){
                if( lineText.substr(-2).charCodeAt(0) === 60){
                    return this.getCloseTagCompletionItems(compilation, lineText, startAt, document )
                }
            }
            else if( triggerKind.charCodeAt(0) === 10 ){
                // const context = this.getProgramStackByLine(compilation.stack, startAt);
                // if( context ){

                //     if( context.isPackageDeclaration ){
                //         return ["import","class","interface","implements",'public','enum','static'].map( (name)=>{
                //             return {text:name,kind:CompletionItemKind.Keyword}
                //         }).concat(this.compiler.options.annotations.map( (name)=>{
                //             return {text:name,kind:CompletionItemKind.Keyword}
                //         }));
                //     }else if( context.isClassDeclaration ){
                //         return ['public','protected','private','static','var','const'].map( (name)=>{
                //             return {text:name,kind:CompletionItemKind.Keyword}
                //         }).concat(this.compiler.options.annotations.map( (name)=>{
                //             return {text:name,kind:CompletionItemKind.Keyword}
                //         }));
                //     }else if( context.isInterfaceDeclaration || context.isEnumDeclaration){
                //         return ['public','var','const'].map( (name)=>{
                //             return {text:name,kind:CompletionItemKind.Keyword}
                //         }).concat(this.compiler.options.annotations.map( (name)=>{
                //             return {text:name,kind:CompletionItemKind.Keyword}
                //         }));
                //     }else {
                //         const pStack = context.getParentStack( stack=>!!(stack.isMethodDefinition || stack.isFunctionExpression || stack.isBlockStatement || stack.isSwitchCase) );
                //         if( pStack ){
                //             return ['var','const','function'].map( (name)=>{
                //                 return {text:name,kind:CompletionItemKind.Keyword}
                //             }).concat( this.getGlobalRefs(), this.getLocalScopeRefs(context) )
                //         }
                //     }
                // }  

            }
        }catch(e){
            if( this.options.debug ){
                console.log( e )
            }
        }
        return [];
    }

    completion(file, lineText, startAt, line, character, triggerKind, document){
       const items = this.getCompletionItems(file, lineText, startAt-(triggerKind ? triggerKind.length : 0),triggerKind, document);
       return items; 
    }

    check(file, source){
        var errors = [];
        try{
            const compilation = this.compiler.createCompilation( file );
            if( compilation ){
                errors = compilation.errors;
                if( !compilation.isValid(source) ){
                    const ast = compilation.parseAst( source );
                    if( ast ){
                        compilation.clear();
                        compilation.createStack(null, ast);
                        compilation.ast = ast;
                        compilation.source = source;
                        compilation.parser();
                    }
                }
                return compilation.errors;
            }    
        }catch(e){
            console.log(e)
        }
        return errors;
    }

    hover(file, startAt, line, character, word){
        try{
            const compilation = this.parser(file);
            let stack = this.getProgramStackByLine( compilation.stack , startAt )
            if( stack ){

                if( stack.isProgram || 
                    stack.isPackageDeclaration || 
                    stack.isClassDeclaration || 
                    stack.isPropertyDefinition || 
                    stack.isDeclaratorDeclaration || 
                    stack.isEnumDeclaration || 
                    stack.isInterfaceDeclaration ){
                    return null;
                }

                const result = stack.definition();
                if( result  ){
                    return {
                        text:result.text || result.expre, 
                        range:result.range,
                        location:result.location,
                        comments:this.comments(result)
                    };
                }
                return null;
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
            //const stack = this.getStackByAt(file, startAt, 3, -1) 
            const compilation = this.parser(file);
            const stack = this.getProgramStackByLine( compilation.stack , startAt )
            if( stack ){
                
                if( stack.isProgram || 
                    stack.isPackageDeclaration || 
                    stack.isClassDeclaration || 
                    stack.isPropertyDefinition || 
                    stack.isDeclaratorDeclaration || 
                    stack.isEnumDeclaration || 
                    stack.isInterfaceDeclaration ){
                    return null;
                }

                const result = stack.definition();
                if( result && !result.location ){
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