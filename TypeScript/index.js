/*
GetFloat64 doesn't work

local upval = 'This is an upvalue';
print(string.dump(function()
    local number = 10;
    local bool = true;
    upval = upval .. '!';
    print('Hello, world!');
end):gsub('.', function(char)
    return char:byte() .. ', ';
end));
*/
var bytecodeArray = [
    27, 76, 117, 97, 81, 0, 1, 4, 8, 4, 8, 0, 7, 0, 0, 0, 0, 0, 0, 0, 60, 101, 118, 97, 108, 62, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 4, 10, 0, 0, 0, 1, 0, 0, 0, 66, 0, 128, 0, 132, 0, 0, 0, 193, 64, 0, 0, 149, 192, 0, 1, 136, 0, 0, 0, 133, 128, 0, 0, 193, 192, 0, 0, 156, 64, 0, 1, 30, 0, 128, 0, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 36, 64, 4, 2, 0, 0, 0, 0, 0, 0, 0, 33, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 112, 114, 105, 110, 116, 0, 4, 14, 0, 0, 0, 0, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 110, 117, 109, 98, 101, 114, 0, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 98, 111, 111, 108, 0, 2, 0, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 117, 112, 118, 97, 108, 0
];
var luaOpcodeTypes = [
    'ABC', 'ABx', 'ABC', 'ABC',
    'ABC', 'ABx', 'ABC', 'ABx',
    'ABC', 'ABC', 'ABC', 'ABC',
    'ABC', 'ABC', 'ABC', 'ABC',
    'ABC', 'ABC', 'ABC', 'ABC',
    'ABC', 'ABC', 'AsBx', 'ABC',
    'ABC', 'ABC', 'ABC', 'ABC',
    'ABC', 'ABC', 'ABC', 'AsBx',
    'AsBx', 'ABC', 'ABC', 'ABC',
    'ABx', 'ABC'
];
var luaOpcodeNames = [
    'MOVE', 'LOADK', 'LOADBOOL', 'LOADNIL',
    'GETUPVAL', 'GETGLOBAL', 'GETTABLE', 'SETGLOBAL',
    'SETUPVAL', 'SETTABLE', 'NEWTABLE', 'SELF',
    'ADD', 'SUB', 'MUL', 'DIV',
    'MOD', 'POW', 'UNM', 'NOT',
    'LEN', 'CONCAT', 'JMP', 'EQ',
    'LT', 'LE', 'TEST', 'TESTSET',
    'CALL', 'TAILCALL', 'RETURN', 'FORLOOP',
    'FORPREP', 'TFORLOOP', 'SETLIST', 'CLOSE',
    'CLOSURE', 'VARARG'
];
function getBits(number, n, n2) {
    return (((1 << n2) - 1) & (number >> (n - 1)));
}
function getInt8(bytecode, index) {
    var bytes = bytecode.slice(index, index + 1);
    index++;
    return [bytes[0], index];
}
function getInt32(bytecode, index) {
    var bytes = bytecode.slice(index, index + 4);
    index += 4;
    return [bytes[3] * 16777216 + bytes[2] * 65536 + bytes[1] * 256 + bytes[0], index];
}
function getInt64(bytecode, index) {
    var _a, _b;
    var a, b;
    _a = getInt32(bytecode, index), a = _a[0], index = _a[1];
    _b = getInt32(bytecode, index), b = _b[0], index = _b[1];
    return [b * 4294967296 + a, index];
}
function getFloat64(bytecode, index) {
    var _a, _b;
    var a, b;
    _a = getInt32(bytecode, index), a = _a[0], index = _a[1];
    _b = getInt32(bytecode, index), b = _b[0], index = _b[1];
    return [(-2 * getBits(b, 1, 32) + 1) * (2 ^ (getBits(b, 21, 31) - 1023)) *
            ((getBits(b, 1, 20) * (2 ^ 32) + a) / (2 ^ 52) + 1), index];
}
var getInt;
var getSizeT;
function getString(bytecode, index, strLen) {
    var _a;
    if (!strLen) {
        _a = getSizeT(bytecode, index), strLen = _a[0], index = _a[1];
    }
    var strBytes = bytecode.slice(index, index + strLen - 1).map(function (value) { return String.fromCharCode(value); }); // Subtract 1 from strLen because the last character is always '\0'.
    var str = strBytes.join('');
    index += strLen;
    return [str, index];
}
function decodeChunk(bytecode, index) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    var chunk = {
        instructions: [],
        constants: [],
        prototypes: [],
        debug: {
            lines: [],
            locals: [],
            upvalues: []
        }
    };
    var sourceName;
    var firstLine;
    var lastLine;
    var upvalues;
    var parameters;
    var vararg;
    var stackSize;
    var instructions;
    var constants;
    var prototypes;
    var lines;
    var locals;
    var upvalueListSize;
    _a = getString(bytecode, index), sourceName = _a[0], index = _a[1];
    console.log("Source name: " + sourceName);
    _b = getInt(bytecode, index), firstLine = _b[0], index = _b[1];
    console.log("Line defined: " + firstLine);
    _c = getInt(bytecode, index), lastLine = _c[0], index = _c[1];
    console.log("Last line defined: " + lastLine);
    _d = getInt8(bytecode, index), upvalues = _d[0], index = _d[1];
    console.log("Number of upvalues: " + upvalues);
    _e = getInt8(bytecode, index), parameters = _e[0], index = _e[1];
    console.log("Number of parameters: " + parameters);
    _f = getInt8(bytecode, index), vararg = _f[0], index = _f[1];
    console.log("Vararg flag: " + vararg);
    _g = getInt8(bytecode, index), stackSize = _g[0], index = _g[1];
    console.log("Number of registers used: " + stackSize);
    chunk.name = sourceName;
    chunk.firstLine = firstLine;
    chunk.lastLine = lastLine;
    chunk.upvalues = upvalues;
    _h = getInt(bytecode, index), instructions = _h[0], index = _h[1];
    console.log("Number of instructions: " + instructions);
    console.log('------------------------\nInstructions:');
    for (var i = 0; i < instructions; i++) {
        var instruction = {};
        var data = void 0;
        var opcode = void 0;
        var opcodeName = void 0;
        var opcodeType = void 0;
        _j = getInt32(bytecode, index), data = _j[0], index = _j[1];
        opcode = getBits(data, 1, 6);
        opcodeName = luaOpcodeNames[opcode];
        opcodeType = luaOpcodeTypes[opcode];
        instruction.opcode = opcode;
        instruction.type = opcodeType;
        instruction.A = getBits(data, 7, 14);
        if (opcodeType == 'ABC') {
            instruction.B = getBits(data, 24, 32);
            instruction.C = getBits(data, 15, 23);
            console.log("[" + i + "] " + opcodeName + " " + instruction.A + " " + instruction.B + " " + instruction.C);
        }
        else if (opcodeType == 'ABx') {
            instruction.Bx = getBits(data, 15, 32);
            console.log("[" + i + "] " + opcodeName + " " + instruction.A + " " + instruction.Bx);
        }
        else if (opcodeType == 'AsBx') {
            instruction.sBx = getBits(data, 15, 32) - 131071;
            console.log("[" + i + "] " + opcodeName + " " + instruction.A + " " + instruction.sBx);
        }
        chunk.instructions.push(instruction);
    }
    console.log('------------------------');
    _k = getInt(bytecode, index), constants = _k[0], index = _k[1];
    console.log("Number of constants: " + constants);
    console.log('------------------------\nConstants:');
    for (var i = 0; i < constants; i++) {
        var constant = {};
        var constType = void 0;
        _l = getInt8(bytecode, index), constType = _l[0], index = _l[1];
        constant.type = constType;
        var constData = void 0;
        if (constType == 1) {
            _m = getInt8(bytecode, index), constData = _m[0], index = _m[1];
            constant.data = (constData != 0);
            console.log("[" + i + "] " + constData);
        }
        else if (constType == 3) {
            _o = getFloat64(bytecode, index), constData = _o[0], index = _o[1];
            constant.data = constData;
            console.log("[" + i + "] " + constData);
        }
        else if (constType == 4) {
            _p = getString(bytecode, index), constData = _p[0], index = _p[1];
            constant.data = constData;
            console.log("[" + i + "] " + constData);
        }
        chunk.constants.push(constant);
    }
    console.log('------------------------');
    _q = getInt(bytecode, index), prototypes = _q[0], index = _q[1];
    console.log("Number of prototypes: " + prototypes);
    for (var i = 0; i < prototypes; i++) {
        chunk.prototypes.push(decodeChunk(bytecode, index));
    }
    _r = getInt(bytecode, index), lines = _r[0], index = _r[1];
    console.log("Source line position list size: " + lines);
    console.log('------------------------\nSource line positions:');
    for (var i = 0; i < lines; i++) {
        var sourceLinePosition = void 0;
        _s = getInt(bytecode, index), sourceLinePosition = _s[0], index = _s[1];
        console.log("[" + i + "] " + sourceLinePosition);
        chunk.debug.lines.push(sourceLinePosition);
    }
    console.log('------------------------');
    _t = getInt(bytecode, index), locals = _t[0], index = _t[1];
    console.log("Local list size: " + locals);
    console.log('------------------------\nLocals:');
    for (var i = 0; i < locals; i++) {
        var local = {};
        var name_1 = void 0;
        var startScope = void 0;
        var endScope = void 0;
        _u = getString(bytecode, index), name_1 = _u[0], index = _u[1];
        _v = getInt(bytecode, index), startScope = _v[0], index = _v[1];
        _w = getInt(bytecode, index), endScope = _w[0], index = _w[1];
        console.log("[" + i + "] " + name_1 + " " + startScope + " " + endScope);
        local.name = name_1;
        local.startScope = startScope;
        local.endScope = endScope;
        chunk.debug.locals.push(local);
    }
    console.log('------------------------');
    _x = getInt(bytecode, index), upvalueListSize = _x[0], index = _x[1];
    console.log("Upvalue list size: " + upvalueListSize);
    console.log('------------------------\nUpvalues:');
    for (var i = 0; i < upvalueListSize; i++) {
        var upvalue = {};
        var name_2 = void 0;
        _y = getString(bytecode, index), name_2 = _y[0], index = _y[1];
        upvalue.name = name_2;
        console.log("[" + i + "] " + name_2);
        chunk.debug.upvalues.push(upvalue);
    }
    console.log('------------------------');
    console.log(chunk);
    return chunk;
}
function decodeBytecode(bytecode) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var index = 1;
    var headerSignature;
    var versionNumber;
    var formatVersion;
    var endiannessFlag;
    var intSize;
    var sizeT;
    var instructionSize;
    var luaNumberSize;
    var integralFlag;
    _a = getString(bytecode, index, 3), headerSignature = _a[0], index = _a[1];
    console.log("Header signature: " + headerSignature);
    _b = getInt8(bytecode, index), versionNumber = _b[0], index = _b[1];
    console.log("Version number: " + versionNumber + ", Hex: 0x" + versionNumber.toString(16));
    _c = getInt8(bytecode, index), formatVersion = _c[0], index = _c[1];
    console.log("Format version: " + formatVersion);
    _d = getInt8(bytecode, index), endiannessFlag = _d[0], index = _d[1];
    console.log("Endianness flag: " + endiannessFlag);
    _e = getInt8(bytecode, index), intSize = _e[0], index = _e[1];
    console.log("Int size: " + intSize);
    _f = getInt8(bytecode, index), sizeT = _f[0], index = _f[1];
    console.log("Size_T size: " + sizeT);
    _g = getInt8(bytecode, index), instructionSize = _g[0], index = _g[1];
    console.log("Instruction size: " + instructionSize);
    _h = getInt8(bytecode, index), luaNumberSize = _h[0], index = _h[1];
    console.log("Lua_Number size: " + luaNumberSize);
    _j = getInt8(bytecode, index), integralFlag = _j[0], index = _j[1];
    console.log("Integral flag: " + integralFlag);
    if (intSize == 4) {
        getInt = getInt32;
    }
    else if (intSize == 8) {
        getInt = getInt64;
    }
    if (sizeT == 4) {
        getSizeT = getInt32;
    }
    else if (sizeT == 8) {
        getSizeT = getInt64;
    }
    decodeChunk(bytecode, index);
}
decodeBytecode(bytecodeArray);
