//const {exec} = require('child_process');
const vscode = require('vscode');
const path = require('path');
const Service = require('./service');

const getOptions = ()=>{
    const config = vscode.workspace.getConfiguration('EaseScript');
    const LoadTypeFile = config.get('LoadTypeFile');
    //const SyntaxPlugins = config.get('SyntaxPlugins');
    //const builder = typeof SyntaxPlugins === 'string' ? SyntaxPlugins.split('|').map( name=>name.trim() ) : [];
    //const root = path.resolve(__dirname,'..');
    const workspaceFolders = vscode.workspace.workspaceFolders.map( item=>{
        return path.resolve( vscode.workspace.asRelativePath( item.uri, true ) );
    });
    // builder.forEach( name=>{
    //     try{
    //         require.resolve(name);
    //     }catch(e){
    //         exec(`npm install ${name}`, {cwd:root},(error)=>{
    //             if( error ){
    //                 vscode.window.showErrorMessage(error.message);
    //             }
    //         });
    //     }
    // });
    
    var globalTypes = void 0;
    if( process.env.NODE_ENV !== 'development' ){
        globalTypes = [path.resolve(__dirname,'typing')]
    }

    return{
        autoLoadDescribeFile:LoadTypeFile !== false,
        cwd:workspaceFolders[0],
        globalTypes:globalTypes
        //builder
    };
}

exports.activate = function(context) {
    const provider =  new Service( getOptions() );
    const collection = vscode.languages.createDiagnosticCollection("easescript");
    function diagnostic(document) {
        if( document.languageId !== "easescript" )return;
        const results = provider.check( document.fileName, document.getText() );
        if( results ){
            const items = results.map( item=>{
                const range = item.range;
                return new vscode.Diagnostic(
                    new vscode.Range( new vscode.Position( range.start.line-1, range.start.column), new vscode.Position(range.end.line-1, range.end.column) ) ,
                    `${item.message} (${item.code})`,
                    item.kind,
                );
            });
            if( items.length > 0){
                collection.set(document.uri, items);
            }else{
                collection.clear();
            }
        }
    }

    if (vscode.window.activeTextEditor){
        diagnostic(vscode.window.activeTextEditor.document);
	}

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => {
        if (e) {
           diagnostic(e.document);
        }
    }));

    let lastChangeId = null;
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            if( lastChangeId ){
                clearTimeout( lastChangeId );
            }
            if( event.contentChanges.length > 0){

                lastChangeId = setTimeout((document)=>{
                    diagnostic(document);
                    lastChangeId = null;
                },100, event.document);

                const content = event.contentChanges[0].text;
                const range = event.contentChanges[0].range;
                let index = content.indexOf('><');
                if( index >= 0 ){
                    index++;
                    vscode.window.activeTextEditor.selection = new vscode.Selection(
                        new vscode.Position( range.start.line, range.start.character+index ),
                        new vscode.Position( range.start.line, range.start.character+index ),
                    );
                }else if( /^(\w+)\s=\s\"\"$/.test(content) ){
                    vscode.window.activeTextEditor.selection = new vscode.Selection(
                        new vscode.Position( range.start.line, range.start.character+(content.length-1) ),
                        new vscode.Position( range.start.line, range.start.character+(content.length-1) ),
                    );
                }
               
            }
        }
    });

    vscode.workspace.onDidChangeWorkspaceFolders(event=>{
        const workspaceFolders = event.workspaceFolders.map( item=>{
            return path.resolve( vscode.workspace.asRelativePath( item.uri, true ) );
        });
        provider.onDidChangeWorkspace( workspaceFolders );
    });

    context.subscriptions.push(vscode.languages.registerHoverProvider('easescript', {
        provideHover(document, position, token){
            const fileName    = document.fileName;
            const range = document.getWordRangeAtPosition(position);
            const start = document.offsetAt(range.start);
            const word = document.getText( range );
            const result = provider.hover(fileName,start, word);
            if( result ){
                const mark = new vscode.MarkdownString();
                mark.appendCodeblock( result.text );
                if( result.comments && result.comments.length>0 ){
                    mark.appendMarkdown("***");
                    let comments = result.comments;
                    comments = comments.map( item=>{
                        return item.replace(/(\@\w+)/i, (a,b)=>{
                            return `*${b}*`;
                        });
                    })
                    mark.appendMarkdown( '\r\n'+comments.join('\r\n\r\n') );
                }
                let range = null;
                if( result.range ){
                    range = new vscode.Range( 
                        new vscode.Position( result.range.start.line-1, result.range.start.column),
                        new vscode.Position( result.range.end.line-1, result.range.end.column)
                    )
                }
                return new vscode.Hover( mark, range);
            }
            return null;
        }
    }));

    context.subscriptions.push(vscode.languages.registerDefinitionProvider('easescript', {
        provideDefinition(document, position, token) {
            const fileName = document.fileName;
            const range = document.getWordRangeAtPosition(position);
            const start = document.offsetAt(range.start);
            const word = document.getText( range );
            const result = provider.definition(fileName, start, word);
            if (result && result.location && result.file) {
                const location = result.location;
                const obj = new vscode.Location(vscode.Uri.file(result.file), new vscode.Position(location.start.line-1, location.start.column) );
                if( result.range ){
                    obj.originSelectionRange = new vscode.Range( 
                        new vscode.Position( result.range.start.line-1, result.range.start.column),
                        new vscode.Position( result.range.end.line-1, result.range.end.column)
                    );
                }
                return obj;
            }
        }
    }));

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('easescript', {
        provideCompletionItems(document, position, token, context) {
            const start = document.offsetAt( position );
            const fileName = document.fileName;
            const lineText = document.lineAt(position).text.replace(/^[\s\t]+/,'');
            const items = provider.completion(fileName,lineText,start,position.line,position.character,context.triggerCharacter, document);
            return (items || []).map( item=>{
                const completionItem = new vscode.CompletionItem(item.text, item.kind);
                completionItem.stack = item.stack;
                if( item.insertText ){
                    completionItem.insertText = item.insertText;
                }
                if( item.replace ){
                    completionItem.range =  new vscode.Range( 
                        new vscode.Position(position.line, position.character + item.replace.posAt ),
                        new vscode.Position(position.line, position.character + item.replace.posAt )
                    );
                }
                return completionItem;
            });
        },
        resolveCompletionItem(item, token) {
            if( item.stack ){
                const def = item.stack.definition();
                if( def ){
                    item.detail = def.expre;
                }
            }
            return item;
        }
        
    },'.',' ','@','\n','<', '>','/'));

    // context.subscriptions.push(vscode.languages.registerCodeActionsProvider('easescript', {
    //     provideCodeActions(document, range, context, token) {
    //         console.log("=========provideCodeActions=========" , document.uri )
    //         console.log( document.getText(range),  token, context)
    //     }
    // }));

};
exports.deactivate = function() {
    if( collection ){
        collection.clear();
    }
    if( provider ){
        provider.clear();
    }
    provider = null;
    //delete provider;
};