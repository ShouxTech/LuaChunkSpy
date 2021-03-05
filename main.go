package main

import (
    "fmt"
    "strconv"
    //"io/ioutil"
)

var luaOpcodeTypes = [38]string {
    "ABC",  "ABx", "ABC",  "ABC",
	"ABC",  "ABx", "ABC",  "ABx",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "AsBx", "ABC",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "ABC",  "AsBx",
	"AsBx", "ABC", "ABC", "ABC",
	"ABx",  "ABC",
}

var luaOpcodeNames = [38]string {
	"MOVE",     "LOADK",     "LOADBOOL", "LOADNIL",
	"GETUPVAL", "GETGLOBAL", "GETTABLE", "SETGLOBAL",
	"SETUPVAL", "SETTABLE",  "NEWTABLE", "SELF",
	"ADD",      "SUB",       "MUL",      "DIV",
	"MOD",      "POW",       "UNM",      "NOT",
	"LEN",      "CONCAT",    "JMP",      "EQ",
	"LT",       "LE",        "TEST",     "TESTSET",
	"CALL",     "TAILCALL",  "RETURN",   "FORLOOP",
	"FORPREP",  "TFORLOOP",  "SETLIST",  "CLOSE",
	"CLOSURE",  "VARARG",
};

type Instruction struct {
    OPCode int
    Type string
    A int
    B int
    C int
    Bx int
    sBx int
}

type Constant struct {
    Type int
    Data interface{}
}

type Local struct {
    Name string
    StartScope int
    EndScope int
}

type Upvalue struct {
    Name string
}

type Debug struct {
    Lines []int
    Locals []Local
    Upvalues []Upvalue
}

type Chunk struct {
    Name string
    FirstLine int
    LastLine int
    Upvalues int
    Arguments int
    Vararg int
    Instructions []Instruction
    Constants []Constant
    Prototypes []Chunk
    Debug Debug
}

func intToHex(n int64) string {
    return strconv.FormatInt(n, 16)
}

func getBits(number int, n int, n2 int) int { 
    return (((1 << n2) - 1) & (number >> (n - 1))); 
} 

func getInt8(bytecode []byte, index int) (int, int) {
    bytes := bytecode[index:index + 1]
    index++
    return int(bytes[0]), index
}

func getInt32(bytecode []byte, index int) (int, int) {
    bytes := bytecode[index:index + 4]
    index += 4
    return int(bytes[3]) * 16777216 + int(bytes[2]) * 65536 + int(bytes[1]) * 256 + int(bytes[0]), index
}

func getInt64(bytecode []byte, index int) (int, int) {
    a, index := getInt32(bytecode, index);
    b, index := getInt32(bytecode, index);
    return b * 4294967296 + a, index;
}

func getFloat64(bytecode []byte, index int) (float64, int) {
    a, index := getInt32(bytecode, index)
    b, index := getInt32(bytecode, index)
    return float64((-2 * getBits(b, 1, 32) + 1) * (2^(getBits(b, 21, 31) - 1023)) *
            ((getBits(b, 1, 20) * (2^32) + a) / (2^52) + 1)), index
}

var getInt func(bytecode []byte, index int) (int, int)

var getSizeT func(bytecode []byte, index int) (int, int)

func getString(bytecode []byte, index int, strLen interface{}) (string, int) {
    var str string
    if strLen != nil {
        str = string(bytecode[index:index + strLen.(int)])
        index += strLen.(int)
        return str, index
    } else {
        strLen, index := getSizeT(bytecode, index)
        /*if strLen == 0 {
            return
        }*/
        str = string(bytecode[index:index + strLen])
        index += strLen
        return str, index
    }
}

func decodeChunk(bytecode []byte, index int) Chunk {
    chunk := Chunk {
        Instructions: []Instruction {},
        Constants: []Constant {},
        Prototypes: []Chunk {},
        Debug: Debug {},
    }

    sourceName, index := getString(bytecode, index, nil)
    fmt.Println("Source name:", sourceName)

    firstLine, index := getInt(bytecode, index)
    fmt.Println("Line defined:", firstLine)

    lastLine, index := getInt(bytecode, index)
    fmt.Println("Last line defined:", lastLine)

    upvalues, index := getInt8(bytecode, index)
    fmt.Println("Number of upvalues:", upvalues)

    parameters, index := getInt8(bytecode, index)
    fmt.Println("Number of parameters:", parameters)

    vararg, index := getInt8(bytecode, index)
    fmt.Println("Vararg flag:", vararg)

    stackSize, index := getInt8(bytecode, index)
    fmt.Println("Number of registers used:", stackSize)

    chunk.Name = sourceName
    chunk.FirstLine = firstLine
    chunk.LastLine = lastLine
    chunk.Upvalues = upvalues

    instructions, index := getInt(bytecode, index)
    fmt.Println("Number of instructions:", instructions)

    fmt.Println("------------------------\nInstructions:")
    for i := 0; i < instructions; i++ {
        instruction := Instruction {}
        data, index2 := getInt32(bytecode, index)
        opcode := getBits(data, 1, 6)
        opcodeName := luaOpcodeNames[opcode]
        opcodeType := luaOpcodeTypes[opcode]

        instruction.OPCode = opcode
        instruction.Type = opcodeType

        instruction.A = getBits(data, 7, 14)
        if opcodeType == "ABC" {
            instruction.B = getBits(data, 24, 32)
			instruction.C = getBits(data, 15, 23)
            fmt.Println("[" + strconv.Itoa(i) + "]", opcodeName, " ", instruction.A, " ", instruction.B, " ", instruction.C)
        } else if opcodeType == "ABx" {
            instruction.Bx = getBits(data, 15, 32);
            fmt.Println("[" + strconv.Itoa(i) + "]", opcodeName, " ", instruction.A, " ", instruction.Bx)
        } else if opcodeType == "AsBx" {
            instruction.sBx = getBits(data, 15, 32) - 131071;
            fmt.Println("[" + strconv.Itoa(i) + "]", opcodeName, " ", instruction.A, " ", instruction.sBx)
        }

        chunk.Instructions = append(chunk.Instructions, instruction)
        index = index2
    }
    fmt.Println("------------------------")

    constants, index := getInt(bytecode, index)
    fmt.Println("Number of constants:", constants)

    fmt.Println("------------------------\nConstants:")
    for i := 0; i < constants; i++ {
        constant := Constant {}

        constType, index2 := getInt8(bytecode, index)
        constant.Type = constType

        var constDataInt int
        var constDataFloat float64
        var constDataString string

        if constType == 1 {
            constDataInt, index2 = getInt8(bytecode, index2)
            constant.Data = (constDataInt != 0)
            fmt.Println("[" + strconv.Itoa(i) + "]", constDataInt)
        } else if constType == 3 {
            constDataFloat, index2 = getFloat64(bytecode, index2)
            constant.Data = constDataFloat
            fmt.Println("[" + strconv.Itoa(i) + "]", constDataFloat)
        } else if constType == 4 {
            constDataString, index2 = getString(bytecode, index2, nil)
            constant.Data = constDataString
            fmt.Println("[" + strconv.Itoa(i) + "]", constDataString)
        }

        chunk.Constants = append(chunk.Constants, constant)
        index = index2
    }
    fmt.Println("------------------------")

    prototypes, index := getInt(bytecode, index)
    fmt.Println("Number of prototypes:", prototypes)

    for i := 0; i < prototypes; i++ {
        chunk.Prototypes = append(chunk.Prototypes, decodeChunk(bytecode, index))
    }

    lines, index := getInt(bytecode, index)
    fmt.Println("Source line position list size:", lines)

    fmt.Println("------------------------\nSource line positions:")
    for i := 0; i < lines; i++ {
        sourceLinePosition, index2 := getInt(bytecode, index)
        fmt.Println("[" + strconv.Itoa(i) + "]", sourceLinePosition)

        chunk.Debug.Lines = append(chunk.Debug.Lines, sourceLinePosition)
        index = index2
    }
    fmt.Println("------------------------")

    locals, index := getInt(bytecode, index)
    fmt.Println("Local list size:", locals)

    fmt.Println("------------------------\nLocals:")
    for i := 0; i < locals; i++ {
        local := Local {}

        name, index2 := getString(bytecode, index, nil)
        startScope, index2 := getInt(bytecode, index2)
        endScope, index2 := getInt(bytecode, index2)

        fmt.Println("[" + strconv.Itoa(i) + "]", name, " ", startScope, " ", endScope)

        local.Name = name
        local.StartScope = startScope
        local.EndScope = endScope

        chunk.Debug.Locals = append(chunk.Debug.Locals, local)
        index = index2
    }
    fmt.Println("------------------------")

    upvalueListSize, index := getInt(bytecode, index)
    fmt.Println("Upvalue list size:", upvalueListSize)

    fmt.Println("------------------------\nUpvalues:")
    for i := 0; i < upvalueListSize; i++ {
        upvalue := Upvalue {}

        name, index2 := getString(bytecode, index, nil)
        upvalue.Name = name

        fmt.Println("[" + strconv.Itoa(i) + "]", name)

        chunk.Debug.Upvalues = append(chunk.Debug.Upvalues, upvalue)
        index = index2
    }
    fmt.Println("------------------------")

    fmt.Println(chunk)
    return chunk
}

func decodeBytecode(bytecode []byte) {
    index := 1

    headerSignature, index := getString(bytecode, index, 3)
    fmt.Println("Header signature:", headerSignature)

    versionNumber, index := getInt8(bytecode, index)
    fmt.Println("Version number:", versionNumber, "Hex:", "0x" + intToHex(int64(versionNumber)))

    formatVersion, index := getInt8(bytecode, index)
    fmt.Println("Format version:", formatVersion)

    endiannessFlag, index := getInt8(bytecode, index)
    fmt.Println("Endianness flag:", endiannessFlag)

    intSize, index := getInt8(bytecode, index)
    fmt.Println("Int size:", intSize)

    sizeT, index := getInt8(bytecode, index)
    fmt.Println("Size_T size:", intSize)

    instructionSize, index := getInt8(bytecode, index)
    fmt.Println("Instruction size:", instructionSize)

    luaNumberSize, index := getInt8(bytecode, index)
    fmt.Println("Lua_Number size:", luaNumberSize)

    integralFlag, index := getInt8(bytecode, index)
    fmt.Println("Integral flag:", integralFlag)

    if intSize == 4 {
        getInt = getInt32
    } else if intSize == 8 {
        getInt = getInt64
    }

    if sizeT == 4 {
        getSizeT = getInt32
    } else if sizeT == 8 {
        getSizeT = getInt64
    }

    decodeChunk(bytecode, index)
}

func main() {
    /*bytecodeString, err := ioutil.ReadFile("bytecode.txt")
    if err != nil {
        fmt.Println(err)
    }
    bytecodeArray := []byte {}
    for _, v := range bytecodeString {
        bytecodeArray = append(bytecodeArray, v)
    }*/
    bytecodeArray := []byte {27, 76, 117, 97, 81, 0, 1, 4, 8, 4, 8, 0, 7, 0, 0, 0, 0, 0, 0, 0, 60, 101, 118, 97, 108, 62, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 4, 10, 0, 0, 0, 1, 0, 0, 0, 66, 0, 128, 0, 132, 0, 0, 0, 193, 64, 0, 0, 149, 192, 0, 1, 136, 0, 0, 0, 133, 128, 0, 0, 193, 192, 0, 0, 156, 64, 0, 1, 30, 0, 128, 0, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 36, 64, 4, 2, 0, 0, 0, 0, 0, 0, 0, 33, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 112, 114, 105, 110, 116, 0, 4, 14, 0, 0, 0, 0, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 110, 117, 109, 98, 101, 114, 0, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 98, 111, 111, 108, 0, 2, 0, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 117, 112, 118, 97, 108, 0}
    decodeBytecode(bytecodeArray)
}
