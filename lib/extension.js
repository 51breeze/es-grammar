const vscode = require('vscode');
console.log("=============")
exports.activate = function(context) {


    console.log( context.extensionUri );
    vscode.window.showInformationMessage("easeScript");

    //console.log("===activate=====",  context)

    //  function provideHover(document, position, token){
    //     const fileName    = document.fileName;
    //     const workDir     = path.dirname(fileName);
    //     const word        = document.getText(document.getWordRangeAtPosition(position));

    //     return new vscode.Hover(`* **名称*`);

    // }

    // const provider = vscode.languages.registerHoverProvider({ scheme: 'file', language: 'easescript' }, {
    //     provideHover
    // });

    // console.log(  provider)



    // context.subscriptions.push(provider);

    // context.subscriptions.push(vscode.languages.registerDefinitionProvider('easescript', {
    //     provideDefinition(document, position, token) {
    //         const fileName    = document.fileName;
    //         const workDir     = path.dirname(fileName);
    //         const word        = document.getText(document.getWordRangeAtPosition(position));
    //         const line        = document.lineAt(position);
    //         const projectPath = util.getProjectPath(document);Y
        
    //         console.log('====== 进入 provideDefinition 方法 ======');
    //         console.log('fileName: ' + fileName); // 当前文件名
    //         console.log('workDir: ' + workDir); // 当前文件所在目录
    //         console.log('word: ' + word); // 当前光标所在单词
    //         console.log('line: ' + line.text); // 当前光标所在行
    //         console.log('projectPath: ' + projectPath); // 当前工程目录
            
    //         if (/\/package\.json$/.test(fileName)) {
    //             console.log(word, line.text);
    //             const json = document.getText();
    //             // 这里我们偷懒只做一个简单的正则匹配
    //             if (new RegExp(`"(dependencies|devDependencies)":\\s*?\\{[\\s\\S]*?${word.replace(/\//g, '\\/')}[\\s\\S]*?\\}`, 'gm').test(json)) {
    //                 let destPath = `${workDir}/node_modules/${word.replace(/"/g, '')}/README.md`;
    //                 if (fs.existsSync(destPath)) {
    //                     // new vscode.Position(0, 0) 表示跳转到某个文件的第一行第一列
    //                     return new vscode.Location(vscode.Uri.file(destPath), new vscode.Position(0, 0));
    //                 }
    //             }
    //         }
    //     }
    // }));

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