const vscode = require('vscode');
const Service = require('../../easescript2/lib/service');

exports.activate = function(context) {

    const service = new Service({types:[
        require.resolve('../../easescript2/test/index.d.es')
    ]});
    const collection = vscode.languages.createDiagnosticCollection("easescript");

    function diagnostic(document) {
        if( document.languageId !== "easescript" )return;
        const results = service.check( document.fileName, document.getText() );
        if( results ){
           const items = results.map( item=>{
                const range = item.range;
                return new vscode.Diagnostic(
                    new vscode.Range( new vscode.Position( range.start.line-1, range.start.column ), new vscode.Position(range.end.line-1, range.end.column) ) ,
                    item.message,
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
   

    if (vscode.window.activeTextEditor) {
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
            if( event.contentChanges.length > 0){
                if( lastChangeId ){
                    clearTimeout( lastChangeId );
                }
                lastChangeId = setTimeout((document)=>{
                    diagnostic(document);
                    lastChangeId = null;
                },500, event.document);
            }
        }
    });

    context.subscriptions.push(vscode.languages.registerHoverProvider('easescript', {
        provideHover(document, position, token){
            const fileName    = document.fileName;
            const range = document.getWordRangeAtPosition(position);
            const start = document.offsetAt(range.start);
            const word = document.getText( range );
            const result = service.start("hover",fileName,start, word);
            if( result ){
                const mark = new vscode.MarkdownString();
                mark.appendCodeblock( result.expre );
                if( result.comments ){
                    mark.appendMarkdown("***");
                    mark.appendCodeblock( result.comments.map( item=>item.value ).join("  ") );
                }
                return new vscode.Hover( mark );
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
            const result = service.start("definition",fileName, start, word);
            if (result && result.location && result.file) {
                const location = result.location;
                return new vscode.Location(vscode.Uri.file(result.file), new vscode.Position(location.start.line-1, location.start.column));
            }
        }
    }));

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('easescript', {
        provideCompletionItems(document, position, token, context) {

            const start = document.offsetAt( position );
            const fileName = document.fileName;
            const lineText = document.lineAt(position).text.replace(/^[\s\t]+/,'');
            const items = service.completion(fileName,lineText,start,position.line,position.character,context.triggerCharacter);
            return (items || []).map( item=>{
                const completionItem = new vscode.CompletionItem(item.text, item.kind);
                completionItem.stack = item.stack;
                return completionItem;
            });
        },
        resolveCompletionItem(item, token) {
            if( item.stack ){
                const def = item.stack.definition(true, item.stack.inference(null,true) );
                if( def ){
                    item.detail = def.expre; 
                }
            }
            //item.insertText = "insertText"
            return item;
        }
        
    },'.',' ','@'));

    // context.subscriptions.push(vscode.languages.registerCodeActionsProvider('easescript', {
    //     provideCodeActions(document, range, context, token) {
    //         console.log("=========provideCodeActions=========" , document.uri )
    //         console.log( document.getText(range),  token, context)
    //     }
    // }));

};
exports.deactivate = function() {
    //to do server end
};