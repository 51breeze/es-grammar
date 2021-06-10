const vscode = require('vscode');
const Service = require('../../easescript2/lib/service');
exports.activate = function(context) {

    const service = new Service();
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
                },1000, event.document);
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
            const result = service.start("definition",fileName,start, word);
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
            const tokens   = lineText.split('.');
            if( context.triggerKind ===1 ){
                tokens.pop();
            }
            const items = service.completion(fileName,tokens,start,position.line,position.character,lineText);
            return (items || []).map( item=>{
                return new vscode.CompletionItem( item.text, item.kind);
            });
               

            // const fileName = document.fileName;
            // const start = document.offsetAt( position );
            // const range = document.getWordRangeAtPosition(position);
            // const word = range ? document.getText( range ) : '';
            // const result = service.start("completion",fileName,start,position.line,position.character,word);
            // if(result && result.items ) {
            //     return result.items.map( item => {
            //         return new vscode.CompletionItem( item.text, vscode.CompletionItemKind.Field);
            //     });
            // }
        },
        resolveCompletionItem(item, token) {
            return null;
        }
        
    },'.'));

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