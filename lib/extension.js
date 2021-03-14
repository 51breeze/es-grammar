const vscode = require('vscode');
const Service = require('../../easescript-acorn/service');
const fs = require("fs");
exports.activate = function(context) {

    const service = new Service();
    const collection = vscode.languages.createDiagnosticCollection("easescript-check");

    function updateDiags(document,collection) {
        let diag1 = new vscode.Diagnostic(
            new vscode.Range( new vscode.Position( 5, 17 ), new vscode.Position( 5, 22 ) ) ,
            "is not exists" ,
            vscode.DiagnosticSeverity.Error,
        );
        if (document) {
            collection.set(document.uri, [diag1]);
        } else {
            collection.clear();
        }
    }

    if (vscode.window.activeTextEditor) {
        //updateDiags(vscode.window.activeTextEditor.document, collection);
	}

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => {
          console.log("==========onDidChangeActiveTextEditor===============")
        if (e) {
           //updateDiags(e.document, collection);
        }
    }))


    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors((e) => {
        console.log("===============onDidChangeVisibleTextEditors 222============")
        if (e) {
           console.log('========onDidChangeVisibleTextEditors====3333=========', e )
           //updateDiags(e.document, collection);
        }
    }))

    context.subscriptions.push(vscode.window.onDidChangeTextEditorViewColumn((e) => {
        console.log("===============onDidChangeTextEditorViewColumn 222============")
        if (e) {
           console.log('========onDidChangeTextEditorViewColumn====3333=========', e )
           //updateDiags(e.document, collection);
        }
    }))

    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {

            if( event.contentChanges.length > 0){
                console.log('========onDidChangeTextDocument============' , event.document.lineAt( event.contentChanges[0].range.end ) )
            }else{
                console.log('========onDidChangeTextDocument============' )
            }
            
        }
    })



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

            console.log( "========registerCompletionItemProvider==========" )
            console.log( document.lineAt(position),  token, context)

            //context.triggerKind ===1

            // const start = document.offsetAt( position );
            // const fileName = document.fileName;
            // const lineText = document.lineAt(position).text.replace(/^[\s\t]+/,'');
            // const tokens   = lineText.split('.');
            // if( context.triggerKind ===1 ){
            //     tokens.pop();
            // }
            // service.completion(fileName,tokens,start,position.line,position.character,lineText);
             
            return [new vscode.CompletionItem( "Hello word", vscode.CompletionItemKind.Field)];
                     

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
            console.log("======resolveCompletionItem==========")
            console.log(item)
            return null;
        }
        
    },'.'));

    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('easescript', {
        provideCodeActions(document, range, context, token) {
            console.log("=========provideCodeActions=========" , document.uri )
            console.log( document.getText(range),  token, context)
        }
    }));




   



     




};
exports.deactivate = function() {
    //to do server end
};