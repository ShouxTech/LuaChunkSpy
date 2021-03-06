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

let bytecodeArray: number[] = [
    27, 76, 117, 97, 81, 0, 1, 4, 8, 4, 8, 0, 7, 0, 0, 0, 0, 0, 0, 0, 60, 101, 118, 97, 108, 62, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 4, 10, 0, 0, 0, 1, 0, 0, 0, 66, 0, 128, 0, 132, 0, 0, 0, 193, 64, 0, 0, 149, 192, 0, 1, 136, 0, 0, 0, 133, 128, 0, 0, 193, 192, 0, 0, 156, 64, 0, 1, 30, 0, 128, 0, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 36, 64, 4, 2, 0, 0, 0, 0, 0, 0, 0, 33, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 112, 114, 105, 110, 116, 0, 4, 14, 0, 0, 0, 0, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 110, 117, 109, 98, 101, 114, 0, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 98, 111, 111, 108, 0, 2, 0, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 117, 112, 118, 97, 108, 0
];

let luaOpcodeTypes: string[] = [
    'ABC',  'ABx', 'ABC',  'ABC',
	'ABC',  'ABx', 'ABC',  'ABx',
	'ABC',  'ABC', 'ABC',  'ABC',
	'ABC',  'ABC', 'ABC',  'ABC',
	'ABC',  'ABC', 'ABC',  'ABC',
	'ABC',  'ABC', 'AsBx', 'ABC',
	'ABC',  'ABC', 'ABC',  'ABC',
	'ABC',  'ABC', 'ABC',  'AsBx',
	'AsBx', 'ABC', 'ABC', 'ABC',
	'ABx',  'ABC'
];

let luaOpcodeNames: string[] = [
	'MOVE',     'LOADK',     'LOADBOOL', 'LOADNIL',
	'GETUPVAL', 'GETGLOBAL', 'GETTABLE', 'SETGLOBAL',
	'SETUPVAL', 'SETTABLE',  'NEWTABLE', 'SELF',
	'ADD',      'SUB',       'MUL',      'DIV',
	'MOD',      'POW',       'UNM',      'NOT',
	'LEN',      'CONCAT',    'JMP',      'EQ',
	'LT',       'LE',        'TEST',     'TESTSET',
	'CALL',     'TAILCALL',  'RETURN',   'FORLOOP',
	'FORPREP',  'TFORLOOP',  'SETLIST',  'CLOSE',
	'CLOSURE',  'VARARG'
];

interface Instruction {
    opcode?: number;
    type?: string;
    A?: number;
    B?: number;
    C?: number;
    Bx?: number;
    sBx?: number;
}

interface Constant {
    type?: number;
    data?: boolean | number | string;
}

interface Local {
    name?: string;
    startScope?: number;
    endScope?: number;
}

interface Upvalue {
    name?: string;
}

interface Debug {
    lines: number[];
    locals: Local[];
    upvalues: Upvalue[];
}

interface Chunk {
    name?: string;
    firstLine?: number;
    lastLine?: number;
    upvalues?: number;
    arguments?: number;
    vararg?: number;
    instructions: Instruction[];
    constants: Constant[];
    prototypes: Chunk[];
    debug: Debug;
}

function getBits(number: number, n: number, n2: number): number { 
    return (((1 << n2) - 1) & (number >> (n - 1))); 
}

function getInt8(bytecode: number[], index: number): [number, number] {
    let bytes = bytecode.slice(index, index + 1);
    index++;
    return [bytes[0], index];
}

function getInt32(bytecode: number[], index: number): [number, number] {
    let bytes = bytecode.slice(index, index + 4);
    index += 4;
    return [bytes[3] * 16777216 + bytes[2] * 65536 + bytes[1] * 256 + bytes[0], index];
}

function getInt64(bytecode: number[], index: number): [number, number] {
    let a: number, b: number;
    [a, index] = getInt32(bytecode, index);
    [b, index] = getInt32(bytecode, index);
    return [b * 4294967296 + a, index];
}

function getFloat64(bytecode: number[], index: number): [number, number] {
    let a: number, b: number;
    [a, index] = getInt32(bytecode, index);
    [b, index] = getInt32(bytecode, index);
    return [(-2 * getBits(b, 1, 32) + 1) * (2^(getBits(b, 21, 31) - 1023)) *
            ((getBits(b, 1, 20) * (2^32) + a) / (2^52) + 1), index];
}

let getInt: (bytecode: number[], index: number) => [number, number];
let getSizeT: (bytecode: number[], index: number) => [number, number];

function getString(bytecode: number[], index: number, strLen?: number): [string, number] {
    if (!strLen) {
        [strLen, index] = getSizeT(bytecode, index);
    }

    let strBytes: string[] = bytecode.slice(index, index + strLen - 1).map((value: number): string => String.fromCharCode(value)); // Subtract 1 from strLen because the last character is always '\0'.

    let str: string = strBytes.join('');

    index += strLen;
    return [str, index];
}

function decodeChunk(bytecode: number[], index: number): Chunk {
    const chunk: Chunk = {
        instructions: [],
        constants: [],
        prototypes: [],
        debug: {
            lines: [],
            locals: [],
            upvalues: []
        }
    }

    let sourceName: string;
    let firstLine: number;
    let lastLine: number;
    let upvalues: number;
    let parameters: number;
    let vararg: number;
    let stackSize: number;
    let instructions: number;
    let constants: number;
    let prototypes: number;
    let lines: number;
    let locals: number;
    let upvalueListSize: number;

    [sourceName, index] = getString(bytecode, index);
    console.log(`Source name: ${sourceName}`);

    [firstLine, index] = getInt(bytecode, index);
    console.log(`Line defined: ${firstLine}`);

    [lastLine, index] = getInt(bytecode, index);
    console.log(`Last line defined: ${lastLine}`);

    [upvalues, index] = getInt8(bytecode, index);
    console.log(`Number of upvalues: ${upvalues}`);

    [parameters, index] = getInt8(bytecode, index);
    console.log(`Number of parameters: ${parameters}`);

    [vararg, index] = getInt8(bytecode, index);
    console.log(`Vararg flag: ${vararg}`);

    [stackSize, index] = getInt8(bytecode, index);
    console.log(`Number of registers used: ${stackSize}`);

    chunk.name = sourceName;
    chunk.firstLine = firstLine;
    chunk.lastLine = lastLine;
    chunk.upvalues = upvalues;

    [instructions, index] = getInt(bytecode, index);
    console.log(`Number of instructions: ${instructions}`);

    console.log('------------------------\nInstructions:');
    for (let i = 0; i < instructions; i++) {
        let instruction: Instruction = {};

        let data: number;
        let opcode: number;
        let opcodeName: string;
        let opcodeType: string;

        [data, index] = getInt32(bytecode, index);
        opcode = getBits(data, 1, 6);
        opcodeName = luaOpcodeNames[opcode];
        opcodeType = luaOpcodeTypes[opcode];

        instruction.opcode = opcode;
        instruction.type = opcodeType;

        instruction.A = getBits(data, 7, 14);
        if (opcodeType == 'ABC') {
            instruction.B = getBits(data, 24, 32);
			instruction.C = getBits(data, 15, 23);
            console.log(`[${i}] ${opcodeName} ${instruction.A} ${instruction.B} ${instruction.C}`);
        } else if (opcodeType == 'ABx') {
            instruction.Bx = getBits(data, 15, 32);
            console.log(`[${i}] ${opcodeName} ${instruction.A} ${instruction.Bx}`);
        } else if (opcodeType == 'AsBx') {
            instruction.sBx = getBits(data, 15, 32) - 131071;
            console.log(`[${i}] ${opcodeName} ${instruction.A} ${instruction.sBx}`);
        }

        chunk.instructions.push(instruction);
    }
    console.log('------------------------');

    [constants, index] = getInt(bytecode, index);
    console.log(`Number of constants: ${constants}`);

    console.log('------------------------\nConstants:');
    for (let i = 0; i < constants; i++) {
        let constant: Constant = {};

        let constType: number;

        [constType, index] = getInt8(bytecode, index)
        constant.type = constType;

        let constData: boolean | number | string;

        if (constType == 1) {
            [constData, index] = getInt8(bytecode, index)
            constant.data = (constData != 0)
            console.log(`[${i}] ${constData}`);
        } else if (constType == 3) {
            [constData, index] = getFloat64(bytecode, index)
            constant.data = constData;
            console.log(`[${i}] ${constData}`);
        } else if (constType == 4) {
            [constData, index] = getString(bytecode, index)
            constant.data = constData;
            console.log(`[${i}] ${constData}`);
        }

        chunk.constants.push(constant);
    }
    console.log('------------------------');

    [prototypes, index] = getInt(bytecode, index);
    console.log(`Number of prototypes: ${prototypes}`);

    for (let i = 0; i < prototypes; i++) {
        chunk.prototypes.push(decodeChunk(bytecode, index));
    }

    [lines, index] = getInt(bytecode, index);
    console.log(`Source line position list size: ${lines}`);

    console.log('------------------------\nSource line positions:');
    for (let i = 0; i < lines; i++) {
        let sourceLinePosition;

        [sourceLinePosition, index] = getInt(bytecode, index);
        console.log(`[${i}] ${sourceLinePosition}`);

        chunk.debug.lines.push(sourceLinePosition);
    }
    console.log('------------------------');

    [locals, index] = getInt(bytecode, index);
    console.log(`Local list size: ${locals}`);

    console.log('------------------------\nLocals:');
    for (let i = 0; i < locals; i++) {
        let local: Local = {};

        let name: string;
        let startScope: number;
        let endScope: number;

        [name, index] = getString(bytecode, index);
        [startScope, index] = getInt(bytecode, index);
        [endScope, index] = getInt(bytecode, index);

        console.log(`[${i}] ${name} ${startScope} ${endScope}`);

        local.name = name;
        local.startScope = startScope;
        local.endScope = endScope;

        chunk.debug.locals.push(local);
    }
    console.log('------------------------');

    [upvalueListSize, index] = getInt(bytecode, index);
    console.log(`Upvalue list size: ${upvalueListSize}`);

    console.log('------------------------\nUpvalues:')
    for (let i = 0; i < upvalueListSize; i++) {
        let upvalue: Upvalue = {};

        let name;
        [name, index] = getString(bytecode, index);
        upvalue.name = name;

        console.log(`[${i}] ${name}`);

        chunk.debug.upvalues.push(upvalue);
    }
    console.log('------------------------');

    console.log(chunk);
    return chunk;
}

function decodeBytecode(bytecode: number[]) {
    let index: number = 1;
    let headerSignature: string;
    let versionNumber: number;
    let formatVersion: number;
    let endiannessFlag: number;
    let intSize: number;
    let sizeT: number;
    let instructionSize: number;
    let luaNumberSize: number;
    let integralFlag: number;

    [headerSignature, index] = getString(bytecode, index, 3);
    console.log(`Header signature: ${headerSignature}`);

    [versionNumber, index] = getInt8(bytecode, index);
    console.log(`Version number: ${versionNumber}, Hex: 0x${versionNumber.toString(16)}`);

    [formatVersion, index] = getInt8(bytecode, index);
    console.log(`Format version: ${formatVersion}`);

    [endiannessFlag, index] = getInt8(bytecode, index);
    console.log(`Endianness flag: ${endiannessFlag}`);

    [intSize, index] = getInt8(bytecode, index);
    console.log(`Int size: ${intSize}`);

    [sizeT, index] = getInt8(bytecode, index);
    console.log(`Size_T size: ${sizeT}`);

    [instructionSize, index] = getInt8(bytecode, index);
    console.log(`Instruction size: ${instructionSize}`);

    [luaNumberSize, index] = getInt8(bytecode, index);
    console.log(`Lua_Number size: ${luaNumberSize}`);

    [integralFlag, index] = getInt8(bytecode, index);
    console.log(`Integral flag: ${integralFlag}`);

    if (intSize == 4) {
        getInt = getInt32;
    } else if (intSize == 8) {
        getInt = getInt64;
    }

    if (sizeT == 4) {
        getSizeT = getInt32;
    } else if (sizeT == 8) {
        getSizeT = getInt64;
    }

    decodeChunk(bytecode, index);
}

decodeBytecode(bytecodeArray);
