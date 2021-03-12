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
            const fileName    = document.fileName;
            const range = document.getWordRangeAtPosition(position);
            const start = document.offsetAt(range.start);
            const word = document.getText( range );
            const result = service.start("definition",fileName,start, word);
            if (result && result.location) {
                const location = result.location;
                return new vscode.Location(vscode.Uri.file(result.file), new vscode.Position(location.start.line-1, location.start.column));
            }
        }
    }));

    // context.subscriptions.push(vscode.languages.registerCompletionItemProvider('easescript', {
    //     provideCompletionItems(document, position, token, context) {
    //         const line        = document.lineAt(position);
    //         const projectPath = util.getProjectPath(document);
        
    //         // 只截取到光标位置为止，防止一些特殊情况
    //         const lineText = line.text.substring(0, position.character);
    //         // 简单匹配，只要当前光标前的字符串为`this.dependencies.`都自动带出所有的依赖
    //         if(/(^|=| )\w+\.dependencies\.$/g.test(lineText)) {
    //             const json = require(`${projectPath}/package.json`);
    //             const dependencies = Object.keys(json.dependencies || {}).concat(Object.keys(json.devDependencies || {}));
    //             return dependencies.map(dep => {
    //                 // vscode.CompletionItemKind 表示提示的类型
    //                 return new vscode.CompletionItem(dep, vscode.CompletionItemKind.Field);
    //             })
    //         }
    //     }
        
    // }, '.'));
};
exports.deactivate = function() {
    //to do server end
};