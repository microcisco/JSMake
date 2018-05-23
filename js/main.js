// const CODE = `
// if (1 > 0) {
//     alert('hi');
//     alert1('hi');
// }
// `;
// const CODE = `
// var fool = 1;
// var fun1 = function () {
//     conosle.log("var fun1");
// }
//
// function func2() {
//     conosle.log("var fun2");
// }
//
// var obj = {};
// obj.p = "heihei";
// obj.fun = function () {
//     console.log("obj.fun");
// };
//
// if (1 > 0) {
//     alert("hi");
// }
// if (func2()) {
//     console.log("func2() ok");
// }
// if (a > b) {
//    console.log("func3() ok");
// }
// for (var i = 0; i < 10; ++i) {
//     console.log("for" + i);
// }
// `;
const CODE = `
var a = "hello world";
console.log(a);
`;


function _tokenizeCode(code) {
    const tokens = [];    // 结果数组
    for (let i = 0; i < code.length; i++) {
        // 从0开始，一个字符一个字符地读取
        let currentChar = code.charAt(i);

        if (currentChar === ';') {
            // 对于这种只有一个字符的语法单元，直接加到结果当中
            tokens.push({
                type: 'sep',
                value: ';',
            });
            // 该字符已经得到解析，不需要做后续判断，直接开始下一个
            continue;
        }

        if (currentChar === '(' || currentChar === ')') {
            // 与 ; 类似只是语法单元类型不同
            tokens.push({
                type: 'parens',
                value: currentChar,
            });
            continue;
        }

        if (currentChar === '}' || currentChar === '{') {
            // 与 ; 类似只是语法单元类型不同
            tokens.push({
                type: 'brace',
                value: currentChar,
            });
            continue;
        }

        if (currentChar === '>' || currentChar === '<') {
            // 与 ; 类似只是语法单元类型不同
            tokens.push({
                type: 'operator',
                value: currentChar,
            });
            continue;
        }

        if (currentChar === '"' || currentChar === '\'') {
            // 引号表示一个字符传的开始
            const token = {
                type: 'string',
                value: currentChar,       // 记录这个语法单元目前的内容
            };
            tokens.push(token);

            const closer = currentChar;
            let escaped = false;        // 表示下一个字符是不是被转译的

            // 进行嵌套循环遍历，寻找字符串结尾
            for (i++; i < code.length; i++) {
                currentChar = code.charAt(i);
                // 先将当前遍历到的字符无条件加到字符串的内容当中
                token.value += currentChar;
                if (escaped) {
                    // 如果当前转译状态是true，就将改为false，然后就不特殊处理这个字符
                    escaped = false;
                } else if (currentChar === '\\') {
                    // 如果当前字符是 \ ，将转译状态设为true，下一个字符不会被特殊处理
                    escaped = true;
                } else if (currentChar === closer) {
                    break;
                }
            }
            continue;
        }

        if (/[0-9]/.test(currentChar)) {
            // 数字是以0到9的字符开始的
            const token = {
                type: 'number',
                value: currentChar,
            };
            tokens.push(token);

            for (i++; i < code.length; i++) {
                currentChar = code.charAt(i);
                if (/[0-9\.]/.test(currentChar)) {
                    // 如果遍历到的字符还是数字的一部分（0到9或小数点）
                    // 这里暂不考虑会出现多个小数点以及其他进制的情况
                    token.value += currentChar;
                } else {
                    // 遇到不是数字的字符就退出，需要把 i 往回调，
                    // 因为当前的字符并不属于数字的一部分，需要做后续解析
                    i--;
                    break;
                }
            }
            continue;
        }

        if (/[a-zA-Z\$\_]/.test(currentChar)) {
            // 标识符是以字母、$、_开始的
            const token = {
                type: 'identifier',
                value: currentChar,
            };
            tokens.push(token);

            // 与数字同理
            for (i++; i < code.length; i++) {
                currentChar = code.charAt(i);
                if (/[a-zA-Z0-9\$\_]/.test(currentChar)) {
                    token.value += currentChar;
                } else {
                    i--;
                    break;
                }
            }
            continue;
        }

        if (/\s/.test(currentChar)) {
            // 连续的空白字符组合到一起
            const token = {
                type: 'whitespace',
                value: currentChar,
            };
            tokens.push(token);

            // 与数字同理
            for (i++; i < code.length; i++) {
                currentChar = code.charAt(i);
                if (/\s]/.test(currentChar)) {
                    token.value += currentChar;
                } else {
                    i--;
                    break;
                }
            }
            continue;
        }

        // 还可以有更多的判断来解析其他类型的语法单元

        // 遇到其他情况就抛出异常表示无法理解遇到的字符
        throw new Error('Unexpected ' + currentChar);
    }
    return tokens;
}

function _parse(tokens) {
    let i = -1;     // 用于标识当前遍历位置
    let curToken;   // 用于记录当前符号

    // 读取下一个语句
    function nextStatement() {
        // 暂存当前的i，如果无法找到符合条件的情况会需要回到这里
        stash();

        // 读取下一个符号
        nextToken();

        if (curToken.type === 'identifier' && curToken.value === 'if') {
            // 解析 if 语句
            const statement = {
                type: 'IfStatement',
            };
            // if 后面必须紧跟着 (
            nextToken();
            if (curToken.type !== 'parens' || curToken.value !== '(') {
                throw new Error('Expected ( after if');
            }

            // 后续的一个表达式是 if 的判断条件
            statement.test = nextExpression();

            // 判断条件之后必须是 )
            nextToken();
            if (curToken.type !== 'parens' || curToken.value !== ')') {
                throw new Error('Expected ) after if test expression');
            }

            // 下一个语句是 if 成立时执行的语句
            statement.consequent = nextStatement();

            // 如果下一个符号是 else 就说明还存在 if 不成立时的逻辑
            if (curToken === 'identifier' && curToken.value === 'else') {
                statement.alternative = nextStatement();
            } else {
                statement.alternative = null;
            }
            commit();
            return statement;
        }

        if (curToken.type === 'brace' && curToken.value === '{') {
            // 以 { 开头表示是个代码块，我们暂不考虑JSON语法的存在
            const statement = {
                type: 'BlockStatement',
                body: [],
            };
            while (i < tokens.length) {
                // 检查下一个符号是不是 }
                stash();
                nextToken();
                if (curToken.type === 'brace' && curToken.value === '}') {
                    // } 表示代码块的结尾
                    commit();
                    break;
                }
                // 还原到原来的位置，并将解析的下一个语句加到body
                rewind();
                statement.body.push(nextStatement());
            }
            // 代码块语句解析完毕，返回结果
            commit();
            return statement;
        }

        // 没有找到特别的语句标志，回到语句开头
        rewind();

        // 尝试解析单表达式语句
        const statement = {
            type: 'ExpressionStatement',
            expression: nextExpression(),
        };
        if (statement.expression) {
            nextToken();
            if (curToken.type !== 'EOF' && curToken.type !== 'sep') {
                throw new Error('Missing ; at end of expression');
            }
            return statement;
        }
    }

    // 读取下一个表达式
    function nextExpression() {
        nextToken();
        if (curToken.type === 'EOF') {
            console.log()
        }
        if (curToken.type === 'identifier') {
            const identifier = {
                type: 'Identifier',
                name: curToken.value,
            };
            stash();
            nextToken();
            if (curToken.type === 'parens' && curToken.value === '(') {
                // 如果一个标识符后面紧跟着 ( ，说明是个函数调用表达式
                const expr = {
                    type: 'CallExpression',
                    caller: identifier,
                    arguments: [],
                };

                stash();
                nextToken();
                if (curToken.type === 'parens' && curToken.value === ')') {
                    // 如果下一个符合直接就是 ) ，说明没有参数
                    commit();
                } else {
                    // 读取函数调用参数
                    rewind();
                    while (i < tokens.length) {
                        // 将下一个表达式加到arguments当中
                        expr.arguments.push(nextExpression());
                        nextToken();
                        // 遇到 ) 结束
                        if (curToken.type === 'parens' && curToken.value === ')') {
                            break;
                        }
                        // 参数间必须以 , 相间隔
                        if (curToken.type !== 'comma' && curToken.value !== ',') {
                            throw new Error('Expected , between arguments');
                        }
                    }
                }
                commit();
                return expr;
            }
            rewind();
            return identifier;
        }

        if (curToken.type === 'number' || curToken.type === 'string') {
            // 数字或字符串，说明此处是个常量表达式
            const literal = {
                type: 'Literal',
                value: eval(curToken.value),
            };
            // 但如果下一个符号是运算符，那么这就是个双元运算表达式
            // 此处暂不考虑多个运算衔接，或者有变量存在
            stash();
            nextToken();
            if (curToken.type === 'operator') {
                commit();
                return {
                    type: 'BinaryExpression',
                    left: literal,
                    right: nextExpression(),
                };
            }
            rewind();
            return literal;
        }

        if (curToken.type !== 'EOF') {
            throw new Error('Unexpected token ' + curToken.value);
        }
    }

    // 往后移动读取指针，自动跳过空白
    function nextToken() {
        do {
            i++;
            curToken = tokens[i] || {type: 'EOF'};
        } while (curToken.type === 'whitespace');
    }

    // 位置暂存栈，用于支持很多时候需要返回到某个之前的位置
    const stashStack = [];

    function stash(cb) {
        // 暂存当前位置
        stashStack.push(i);
    }

    function rewind() {
        // 解析失败，回到上一个暂存的位置
        i = stashStack.pop();
        curToken = tokens[i];
    }

    function commit() {
        // 解析成功，不需要再返回
        stashStack.pop();
    }

    const ast = {
        type: 'Program',
        body: [],
    };

    // 逐条解析顶层语句
    while (i < tokens.length) {
        const statement = nextStatement();
        if (!statement) {
            break;
        }
        ast.body.push(statement);
    }
    return ast;
}

// console.log(tokenizeCode(";;;"));
// let parse2 = _parse(_tokenizeCode(CODE));
// console.log(JSON.stringify(_parse(_tokenizeCode(';;;'))));
////////////////////////////////
/**
 * @enum token type
 * */
const TOKEN_TYPE = {
    annotation: 0,        //注释
    whitespace: 1,        //空白
    sep: 2,               //分号
    identifier: 3,        //标识
    operator: 4,          //操作符
    number: 5,            //数字
    string: 6,            //字符串
    parentheses: 7,       //小括号
    bracket: 8,           //中括号
    brace: 9,             //大括号
    enter: 10,            //回车
    point: 11,            //点语法
    /**
     * @method 获取ast不需要解析的type
     * */
    getInvalidType() {
        return [this.annotation, this.whitespace];
    }
};

/**
 * @class Token
 * */
class Token {
    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value;
    }

    constructor(type = 0, value = '') {
        this._type = type;
        this._value = value;
    }
}

function tokenizeCode(code) {
    const tokens = [];    // 结果数组
    for (let i = 0; i < code.length; ++i) {
        let currentChar = code.charAt(i);
        //匹配空格
        if (/\s/.test(currentChar)) {
            //剔除多余的空格
            for (++i; i < code.length; ++i) {
                if (!(/\s/.test(code.charAt(i)))) {
                    --i;
                    break;
                }
            }
            tokens.push(new Token(TOKEN_TYPE.whitespace, currentChar));
            continue;
        }
        //匹配换行
        if (/\s\S/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.enter, currentChar));
            continue;
        }
        //匹配分号
        if (/[;]/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.sep, currentChar));
            continue;
        }
        //匹配标识
        if (/[a-zA-Z$_]/.test(currentChar)) {
            //组合标识
            for (++i; i < code.length; ++i) {
                if (!(/[a-zA-Z0-9$_]/.test(code.charAt(i)))) {
                    --i;
                    break;
                }
                currentChar += code.charAt(i);
            }
            tokens.push(new Token(TOKEN_TYPE.identifier, currentChar));
            continue;
        }
        //匹配小括号
        if (/[()]/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.parentheses, currentChar));
            continue;
        }
        //匹配中括号
        if (/[[]/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.bracket, currentChar));
            continue;
        }
        //匹配大括号
        if (/[{}]/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.brace, currentChar));
            continue;
        }
        //匹配操作符号
        if (/[<>=+,:*/-]/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.operator, currentChar));
            continue;
        }
        //字符串
        if (/["']/.test(currentChar)) {
            //字符串
            for (++i; i < code.length; ++i) {
                if ((/["']/.test(code.charAt(i)))) {
                    currentChar += code.charAt(i);
                    break;
                }
                currentChar += code.charAt(i);
            }
            tokens.push(new Token(TOKEN_TYPE.string, currentChar));
            continue;
        }
        //数字(不包括负数)
        if (/[0-9]/.test(currentChar)) {
            //字符串
            for (++i; i < code.length; ++i) {
                if (!(/[0-9.]/.test(code.charAt(i)))) {
                    --i;
                    break;
                }
                currentChar += code.charAt(i);
            }
            tokens.push(new Token(TOKEN_TYPE.number, currentChar));
            continue;
        }
        //点语法
        if (/[.]/.test(currentChar)) {
            tokens.push(new Token(TOKEN_TYPE.point, currentChar));
            continue;
        }


        throw new Error('Unexpected ' + currentChar);
    }
    return tokens;
}

// console.log(tokenizeCode(CODE));

/**
 * @class EStree
 * */
class AST {
    /**
     * @return {Token}
     * */
    get curToken() {
        return this._curToken;
    }

    // noinspection JSAnnotator
    set curToken(value) {
        this._curToken = value;
    }

    get tokens() {
        return this._tokens;
    }

    set tokens(value) {
        this._tokens = value;
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get stack() {
        return this._stack;
    }

    set stack(value) {
        this._stack = value;
    }

    constructor(tokens = []) {
        this._tokens = tokens;
        this._index = -1;
        this._curToken = null;
        this._stack = [];
    }

    /**
     * @method 生成语法树
     * */
    parse() {
        const ast = {
            type: 'Program',
            body: [],
        };
        //遍历解析
        while (this.index < this.tokens.length) {
            const statement = this.nextStatement();
            if (!statement) break;
            ast.body.push(statement);
        }
        return ast;
    }

    /**
     * @method 读取 && 返回下一个语句
     * */
    nextStatement() {
        //压栈
        this.stash();
        //移动迭代器
        this.nextToken();
        //逻辑判断
        if (this.curToken.type === TOKEN_TYPE.sep) {this.commit();this.stash(); this.nextToken();}   //分号不处理
        if (this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value === 'if') {    //if语法
            const statement = {
                type: 'IfStatement',
            };
            this.nextToken();
            //if后面必须是小括号
            if (this.curToken.type !== TOKEN_TYPE.parentheses || this.curToken.value !== '(') {
                throw new Error('Expected ( after if');
            }
            // 后续的一个表达式是 if 的判断条件
            statement.test = this.nextExpression();
            //表达式后面必须是个小括号
            this.nextToken();
            if (this.curToken.type !== TOKEN_TYPE.parentheses || this.curToken.value !== ')') {
                throw new Error('Expected ) after if test expression');
            }
            //if条件成立时执行的语句
            statement.consequent = this.nextStatement();
            //弹栈
            this.commit();
            return statement;
        }
        if (this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value === 'for') {    //if语法
            const statement = {
                type: 'ForStatement',
            };
            this.nextToken();
            //for后面必须是小括号
            if (this.curToken.type !== TOKEN_TYPE.parentheses || this.curToken.value !== '(') {
                throw new Error('Expected ( after if');
            }
            // 后续的一个表达式是 for 的初始变量
            statement.init = this.nextStatement();

            // 后续的一个表达式是 for 的测试
            statement.test = this.nextExpression();

            //更新量
            statement.update = this.nextExpression();

            //表达式后面必须是个小括号
            this.nextToken();
            if (this.curToken.type !== TOKEN_TYPE.parentheses || this.curToken.value !== ')') {
                throw new Error('Expected ) after if test expression');
            }
            //for 循环体
            statement.body = this.nextStatement();
            //弹栈
            this.commit();
            return statement;
        }
        if (this.curToken.type === TOKEN_TYPE.brace && this.curToken.value === '{') {     //代码块
            const statement = {
                type: 'BlockStatement',
                body: [],
            };
            while (this.index < this.tokens.length) {
                this.stash();
                this.nextToken();
                if (this.curToken.type === TOKEN_TYPE.brace && this.curToken.value === '}') {    //代码块结束
                    this.commit();
                    break;
                }
                // 还原到原来的位置，并将解析的下一个语句加到body
                this.rewind();
                statement.body.push(this.nextStatement());
            }
            this.commit();
            return statement;
        }
        if (this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value === 'var') {    //变量申明
            const statement = {
                type: 'VariableDeclaration',
                kind: 'var',
            };
            this.nextToken();
            //变量名
            statement.declarations = {
                id: {name: this.curToken.value},
            };
            //初始值
            this.stash();
            this.nextToken();
            if (this.curToken.type !== TOKEN_TYPE.operator || this.curToken.value !== '=') {    //没有赋初始值
                this.rewind();
                return statement;
            } else {    //有赋初始值
                this.stash();
                this.nextToken();
                if(this.curToken.type === TOKEN_TYPE.identifier || this.curToken.value === 'function') {    //初始值是函数
                    this.stash();
                    this.nextToken();
                    if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === '(') {    //function后面必须是(
                        const expr = {
                            type: 'FunctionExpression',
                            arguments: [],
                        };
                        statement.declarations.init = {value: expr};
                        this.stash();
                        this.nextToken();
                        if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {    //无参函数
                            this.commit();
                        } else {    //带参数调用
                            this.rewind();
                            while (this.index < this.tokens.length) {
                                // 将下一个表达式加到arguments当中
                                expr.arguments.push(this.nextExpression());
                                this.nextToken();
                                // 遇到 ) 结束
                                if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {
                                    break;
                                }
                                // 参数间必须以 , 相间隔
                                if (this.curToken.type !== TOKEN_TYPE.point && this.curToken.value !== ',') {
                                    throw new Error('Expected , between arguments');
                                }
                            }
                        }
                        this.commit();
                        expr.body = this.nextStatement();
                        return statement;
                    } else {    //将函数赋值给变量语法错误
                        throw new Error('Expected lambda declaration');
                    }
                } else if(this.curToken.type === TOKEN_TYPE.identifier || this.curToken.value === '{') {    //初始值是对象
                    //对象属性
                    this.rewind();
                    statement.declarations.init = this.nextExpression();

                } else {    //初始值是普通变量
                    statement.declarations.init = {value: this.curToken.value};
                }
            }

            this.commit();
            return statement;
        }
        if(this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value === 'function') {
            this.rewind();
            return this.nextExpression();
        }

        /*
        if(this.curToken.type === TOKEN_TYPE.identifier) {    // 尝试解析对象属性
            this.stash();
            this.nextToken();
            if(this.curToken.type === TOKEN_TYPE.point && this.curToken.value === '.') {    //"."语法   靠，暂时做个属性赋值
                this.rewind();
                this.rewind();
                const statement = {
                    type: 'MemberExpression',
                };
                statement.object = this.nextExpression();
                this.nextToken();    //跳过"."符号
                statement.property = this.nextExpression();

                //////////////
                this.nextToken();
                if(this.curToken.type === TOKEN_TYPE.operator && this.curToken.value === '=') {  //赋值表达式
                    const otherStatement = {
                        type: 'AssignmentExpression',
                    };
                    otherStatement.left = statement;
                    otherStatement.right = this.nextExpression();
                    return otherStatement;
                }

                else {
                    return statement;
                }

            }




            if(this.curToken.type === TOKEN_TYPE.operator && this.curToken.value === '=') {    //"="语法
                this.rewind();
                this.rewind();
                const statement = {
                    type: 'AssignmentExpression',
                };
                statement.left = this.nextExpression();
                this.nextToken();    //跳过赋值符号
                statement.right = this.nextExpression();
                return statement;
            }

        }

        if (this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value === '=') {

        }

        */

        // 回到语句开头
        this.rewind();

        // 解析单表达式语句
        const statement = {
            type: 'ExpressionStatement',
            expression: this.nextExpression(),
        };
        if (statement.expression) {
            this.nextToken();
            return statement
        }
    }

    /**
     * @method 读取 && 返回下一个表达式
     * */
    nextExpression() {
        this.nextToken();
        if (!this.curToken) return;
        if (this.curToken.type === TOKEN_TYPE.sep) {this.nextToken();}   //分号不处理
        if (this.curToken.type === TOKEN_TYPE.number || this.curToken.type === TOKEN_TYPE.string) {    //常量表达式
            const literal = {
                type: 'Literal',
                value: this.curToken.value,
            };
            if (this.curToken.type === TOKEN_TYPE.number) {
                literal.value = parseFloat(literal.value);
            }
            this.stash();
            this.nextToken();
            if (this.curToken.type === TOKEN_TYPE.operator && ['+', '-', '*', '/', '>','<','==','==='].indexOf(this.curToken.value) !== -1) {
                this.commit();
                return {
                    type: 'BinaryExpression',
                    operator: this.curToken.value,
                    left: literal,
                    right: this.nextExpression(),
                };
            }
            this.rewind();
            return literal;
        }

        if (false && this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value !== 'function') {    //常量表达式
            const identifier = {
                type: 'Identifier',
                name: this.curToken.value,
            };
            this.stash();
            this.nextToken();
            if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === '(') {    //函数调用
                const expr = {
                    type: 'CallExpression',
                    caller: identifier,
                    arguments: [],
                };
                this.stash();
                this.nextToken();
                if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {    //无参调用
                    this.commit();
                } else {    //带参数调用
                    this.rewind();
                    while (this.index < this.tokens.length) {
                        // 将下一个表达式加到arguments当中
                        expr.arguments.push(this.nextExpression());
                        this.nextToken();
                        // 遇到 ) 结束
                        if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {
                            break;
                        }
                        // 参数间必须以 , 相间隔
                        if (this.curToken.type !== TOKEN_TYPE.operator && this.curToken.value !== ',') {
                            throw new Error('Expected , between arguments');
                        }
                    }
                }
                this.commit();
                return expr;
            }
            this.rewind();
            return identifier;
        }

        if (this.curToken.type === TOKEN_TYPE.brace && this.curToken.value === '{') {    //对象
            const literal = {
                type: 'ObjectExpression',
                properties: [],
            };
            //读取属性
            this.stash();
            this.nextToken();
            if (this.curToken.type === TOKEN_TYPE.brace && this.curToken.value === '}') {    //无属性的空字段
                this.commit();
            } else {    //带参数调用
                this.rewind();
                while (this.index < this.tokens.length) {
                    // 将下一个表达式加到arguments当中
                    const property = {
                        type: 'Property',
                        key: {},
                        value: {},
                    };
                    literal.properties.push(property);
                    this.nextToken();
                    //字段名
                    property.key.name = this.curToken.value;
                    // 字段的key和value用:分开
                    this.nextToken();
                    if (this.curToken.type !== TOKEN_TYPE.operator || this.curToken.value !== ':') {
                        throw new Error('Expected , between key and value');
                    }
                    //字段值
                    property.value.value = this.nextExpression();

                    this.nextToken();
                    // 遇到 } 结束
                    if (this.curToken.type === TOKEN_TYPE.brace && this.curToken.value === '}') {
                        break;
                    }
                    // 字段间必须以 , 相间隔
                    if (this.curToken.type !== TOKEN_TYPE.operator && this.curToken.value !== ',') {
                        throw new Error('Expected , between field');
                    }
                }
            }
            return literal;
        }

        if(this.curToken.type === TOKEN_TYPE.identifier && this.curToken.value === 'function') {    //函数申明
            const statement = {
                type: 'FunctionDeclaration',
                arguments: [],
            };
            this.nextToken();
            //函数名
            statement.id = {
                name: this.curToken.value,
            };
            //函数名后面必须是小括号
            this.stash();
            this.nextToken();
            if (this.curToken.type !== TOKEN_TYPE.parentheses || this.curToken.value !== '(') {
                this.rewind();
                if(this.curToken.type === TOKEN_TYPE.parentheses || this.curToken.value === '(') {    //匿名函数
                    delete statement.id;
                } else {    //普通函数
                    throw new Error('Expected ( after if');
                }
            }
            //函数参数
            this.stash();
            this.nextToken();
            if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {    //无参函数
                this.commit();
            } else {    //带参数调用
                this.rewind();
                while (this.index < this.tokens.length) {
                    // 将下一个表达式加到arguments当中
                    statement.arguments.push(this.nextExpression());
                    this.nextToken();
                    // 遇到 ) 结束
                    if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {
                        break;
                    }
                    // 参数间必须以 , 相间隔
                    if (this.curToken.type !== TOKEN_TYPE.operator && this.curToken.value !== ',') {
                        throw new Error('Expected , between arguments');
                    }
                }
            }
            //函数体
            statement.body = {
                body: this.nextStatement(),
            };

            return statement;
        }

        if (this.curToken.type === TOKEN_TYPE.identifier) {    //Identifier  标识符
            const Identifier = {
                type: 'Identifier',
            };
            // this.stash();
            Identifier.name = this.curToken.value;
            let MemberExpression = null;
            //开始寻找结尾
            while (this.index < this.tokens.length) {
                this.stash();
                this.nextToken();
                //";" || 换行 结束
                if (this.curToken.type === TOKEN_TYPE.sep || this.curToken.type === TOKEN_TYPE.enter ) {
                    this.rewind();
                    return MemberExpression?MemberExpression:Identifier;
                }
                //访问属性
                if (this.curToken.type === TOKEN_TYPE.point && this.curToken.value === '.') {  //访问属性
                    let memberExpression = {
                        type: 'MemberExpression',
                    };
                    memberExpression.object = Identifier;
                    while (this.index < this.tokens.length) {
                        this.stash();
                        this.nextToken();

                        if(this.curToken.type === TOKEN_TYPE.identifier) {
                            //提交
                            this.commit();
                            memberExpression.property = {
                                type: 'Identifier',
                                name: this.curToken.value
                            };
                        } else {
                           this.rewind();
                            break;
                        }

                        this.stash();
                        this.nextToken();

                        if(this.curToken.type === TOKEN_TYPE.point && this.curToken.value === '.') {
                            //提交
                            this.commit();
                            let objMemberExpression = {
                                type: 'MemberExpression',
                            };
                            objMemberExpression.object = memberExpression;
                            memberExpression = objMemberExpression;
                        } else {

                            //提交
                            this.rewind();
                            break;
                        }


                    }
                    MemberExpression = memberExpression;
                }
                // 遇到 "=" 结束
                if (this.curToken.type === TOKEN_TYPE.operator && this.curToken.value === '=') {  //赋值语句
                    this.commit();
                    return {
                        type: 'AssignmentExpression',
                        left: MemberExpression?MemberExpression:Identifier,
                        right: this.nextExpression(),
                        operator: '='
                    };
                }
                // 遇到 "()" 结束
                if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === '(') {  //调用语句
                    const expr = {
                        type: 'CallExpression',
                        caller: MemberExpression?MemberExpression:Identifier,
                        arguments: [],
                    };
                    this.stash();
                    this.nextToken();
                    if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {    //无参调用
                        this.commit();
                    } else {    //带参数调用
                        this.rewind();
                        while (this.index < this.tokens.length) {
                            // 将下一个表达式加到arguments当中
                            expr.arguments.push(this.nextExpression());
                            // 遇到 ) 结束
                            if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {
                                break;
                            }
                            this.nextToken();
                            // 遇到 ) 结束
                            if (this.curToken.type === TOKEN_TYPE.parentheses && this.curToken.value === ')') {
                                break;
                            }
                            // 参数间必须以 , 相间隔
                            if (this.curToken.type !== TOKEN_TYPE.operator && this.curToken.value !== ',') {
                                throw new Error('Expected , between arguments');
                            }
                        }
                    }
                    this.commit();
                    return expr;
                }
                //遇到 "算数运算符" 结束
                if(this.curToken.type === TOKEN_TYPE.operator && ~['+', '-', '*', '/', '>','<','==','==='].indexOf(this.curToken.value)) {
                    let binaryExpression = {
                        type: 'BinaryExpression',
                        operator:this.curToken.value
                    };
                    binaryExpression.left = Identifier;
                    this.nextToken();
                    binaryExpression.right = {
                        type: 'Identifier',
                        name: this.curToken.value
                    };

                    this.commit();
                    return binaryExpression;
                }

                //提交
                this.commit()
            }
        }

        if(this.curToken.type === TOKEN_TYPE.operator && ~['+','-'].indexOf(this.curToken.value)) {
            this.stash();
            this.nextToken();
            if(this.curToken.type === TOKEN_TYPE.operator && ~['+','-'].indexOf(this.curToken.value)) {
                const updateExpression = {
                    type: 'UpdateExpression',
                    operator: this.curToken.value + this.curToken.value,
                };
                this.nextToken();
                updateExpression.argument = {
                    type: 'Identifier',
                    name: this.curToken.value,
                };
                this.commit();
                return updateExpression
            } else {
                this.rewind();
            }
        }
    }

    /**
     * @method 读取下一个语法单元 && 赋值给curToken
     * */
    nextToken() {
        this.curToken = this.tokens[++this.index] || null;
        if (!this.curToken) return;
        while (~TOKEN_TYPE.getInvalidType().indexOf(this.curToken.type)) {
            this.curToken = this.tokens[++this.index] || {type: 'EOF'};
            if (!this.curToken) return;
        }
    }

    /**
     * @method 压栈前读取符号的位置
     * */
    stash() {
        this.stack.push(this.index);
    }

    /**
     * @method 回滚
     * */
    rewind() {
        this.index = this.stack.pop();
        this.curToken = this.tokens[this.index];
    }

    /**
     * @method 弹栈
     * */
    commit() {
        this.stack.pop();
    }
}

// let ast = new AST(tokenizeCode(CODE));
// let parse = ast.parse();
// console.log(parse);
let ast = new AST(tokenizeCode(CODE));   //代码预处理
let parse = ast.parse();                 //编译代码
console.log(JSON.stringify(parse));