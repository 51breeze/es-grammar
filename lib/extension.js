const vscode = require('vscode');
const Service = require('../../easescript2/service');
exports.activate = function(context) {

    const service = new Service();
    
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
            const fileName = document.fileName;
            const start = document.offsetAt( position );
            const range = document.getWordRangeAtPosition(position);
            const word = range ? document.getText( range ) : '';
            const result = service.start("completion",fileName,start,position.line,position.character,word);
            if(result && result.items ) {
                return result.items.map( item => {
                    return new vscode.CompletionItem( item.text, vscode.CompletionItemKind.Field);
                });
            }
        },
        resolveCompletionItem(item, token) {
            return null;
        }
        
    },'.'));
};
exports.deactivate = function() {
    //to do server end
};