import com.alibaba.fastjson.JSON
import kotlin.reflect.KFunction1

var jsonStr = "{\"type\":\"Program\",\"body\":[{\"type\":\"VariableDeclaration\",\"kind\":\"var\",\"declarations\":{\"id\":{\"name\":\"a\"},\"init\":{\"value\":\"\\\"hello world\\\"\"}}},{\"type\":\"ExpressionStatement\",\"expression\":{\"type\":\"CallExpression\",\"caller\":{\"type\":\"MemberExpression\",\"obj\":{\"type\":\"Identifier\",\"name\":\"console\"},\"property\":{\"type\":\"Identifier\",\"name\":\"log\"}},\"arguments\":[{\"type\":\"Identifier\",\"name\":\"a\"}]}}]}\n"

class Node constructor(var type: String?,
                       var kind: String?,
                       var declarations: Declarations?,
                       var expression: Expression?
)

class Declarations constructor(var id: Id?, var init: Init?)
class Id constructor(var name: String?)
class Init constructor(var value: String?)
class Expression constructor(var type: String?, var caller: Caller?, var arguments: ArrayList<Property?>?)
class Caller constructor(var type: String?, var obj: Object?, var property: Property?)
class Object constructor(var type: String?, var name: String?)
class Property constructor(var type: String?, var name: String?)


class Handler {
    companion object {
        val handler = Handler()
    }

    //程序入口
    fun Program(node: Node, scope: HashMap<String, Any>) {
    }

    //表达式语句
    fun ExpressionStatement(node: Node, scope: HashMap<String, Any>) {
        val obj = node.expression!!.caller!!.obj!!.name
        val p = node.expression!!.caller!!.property!!.name
        //参数
        val arguments = node.expression!!.arguments
        val args:ArrayList<Any> = ArrayList()
        if(arguments != null) {
            for(arg in arguments) {
                val property = arg as Property
                if(property.name != null) {
                    val any = scope[property.name!!]
                    if(any != null) {
                        args.add(any)
                    }
                }
            }
        }

        if(obj != null && p != null) {
            val hashMap = scope[obj] as HashMap<String, Any>
            val kFunction1 = hashMap[p] as KFunction1<Array<Any>, Unit>

            kFunction1.invoke(args.toArray())
        }
    }

    //变量表达式
    fun VariableDeclaration(node: Node, scope: HashMap<String, Any>) {
        val name = node.declarations!!.id!!.name
        val value = node.declarations!!.init!!.value
        if (name != null) scope[name] = Unit
        if (name != null && value != null) scope[name] = value
    }

    //函数调用表达式
    fun CallExpression(node: Node, scope: HashMap<String, Any>) {
    }

    //成员表达式
    fun MemberExpression(node: Node, scope: HashMap<String, Any>) {
    }

    //标识符
    fun Identifier(node: Node, scope: HashMap<String, Any>) {
    }

    //数字
    fun NumericLiteral(node: Node, scope: HashMap<String, Any>) {
    }
}

//执行入口
fun evaluate(node: Node, scope: HashMap<String, Any>) {
    val type = node.type
    try {
        val method = Handler.handler.javaClass.getDeclaredMethod(type, Node::class.java, HashMap::class.java)
        method.invoke(Handler.handler, node, scope)
    } catch (err: Exception) {
        print(err)
    }
}

class AST constructor(var type: String, var body: ArrayList<Node>)

fun p(vararg params:Any) {
    for(param in params) {
        print(param)
    }
}

fun main(args: Array<String>) {
    val parseObject = JSON.parseObject(jsonStr, AST::class.java)

    val scope: HashMap<String, Any> = HashMap()
    val hash: HashMap<String, Any> = HashMap()
    hash["log"] = ::p
    scope["console"] = hash
    //执行JS
    for (node in parseObject.body) {
        evaluate(node, scope)
    }
}


