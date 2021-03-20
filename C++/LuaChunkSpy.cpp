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

#include <iostream>

int bytecodeArray[259] = {
	27, 76, 117, 97, 81, 0, 1, 4, 8, 4, 8, 0, 7, 0, 0, 0, 0, 0, 0, 0, 60, 101, 118, 97, 108, 62, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 4, 10, 0, 0, 0, 1, 0, 0, 0, 66, 0, 128, 0, 132, 0, 0, 0, 193, 64, 0, 0, 149, 192, 0, 1, 136, 0, 0, 0, 133, 128, 0, 0, 193, 192, 0, 0, 156, 64, 0, 1, 30, 0, 128, 0, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 36, 64, 4, 2, 0, 0, 0, 0, 0, 0, 0, 33, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 112, 114, 105, 110, 116, 0, 4, 14, 0, 0, 0, 0, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 110, 117, 109, 98, 101, 114, 0, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 98, 111, 111, 108, 0, 2, 0, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 117, 112, 118, 97, 108, 0
};

std::string luaOpcodeTypes[] = {
	"ABC",  "ABx", "ABC",  "ABC",
	"ABC",  "ABx", "ABC",  "ABx",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "AsBx", "ABC",
	"ABC",  "ABC", "ABC",  "ABC",
	"ABC",  "ABC", "ABC",  "AsBx",
	"AsBx", "ABC", "ABC", "ABC",
	"ABx",  "ABC"
};

std::string luaOpcodeNames[] = {
	"MOVE",     "LOADK",     "LOADBOOL", "LOADNIL",
	"GETUPVAL", "GETGLOBAL", "GETTABLE", "SETGLOBAL",
	"SETUPVAL", "SETTABLE",  "NEWTABLE", "SELF",
	"ADD",      "SUB",       "MUL",      "DIV",
	"MOD",      "POW",       "UNM",      "NOT",
	"LEN",      "CONCAT",    "JMP",      "EQ",
	"LT",       "LE",        "TEST",     "TESTSET",
	"CALL",     "TAILCALL",  "RETURN",   "FORLOOP",
	"FORPREP",  "TFORLOOP",  "SETLIST",  "CLOSE",
	"CLOSURE",  "VARARG"
};

int* slice(int* array, int start, int end) {
	int length = (end - start) + 1;
	int* sliced = new int[length];
	memcpy(sliced, array + start, sizeof(int) * length);
	return sliced;
}

int getBits(int number, int n, int n2) {
	return (((1 << n2) - 1) & (number >> (n - 1)));
}

int getInt8(int bytecode[], int &index) {
	int* bytes = slice(bytecode, index, index + 1);
	int b0 = bytes[0];
	delete[] bytes;
	index++;
	return b0;
}

int getInt32(int bytecode[], int &index) {
	int* bytes = slice(bytecode, index, index + 4);
	int b0 = bytes[0], b1 = bytes[1], b2 = bytes[2], b3 = bytes[3];
	delete[] bytes;
	index += 4;
	return b3 * 16777216 + b2 * 65536 + b1 * 256 + b0;
}

int getInt64(int bytecode[], int& index) {
	int a, b;
	a = getInt32(bytecode, index);
	b = getInt32(bytecode, index);
	return b * 4294967296 + a;
}

float getFloat64(int bytecode[], int& index) {
	int a, b;
	a = getInt32(bytecode, index);
	b = getInt32(bytecode, index);
	return (-2 * getBits(b, 1, 32) + 1) * (2 ^ (getBits(b, 21, 31) - 1023)) *
		((getBits(b, 1, 20) * (2 ^ 32) + a) / (2 ^ 52) + 1);
}

int (*getInt)(int bytecode[], int& index);
int (*getSizeT)(int bytecode[], int& index);

std::string getString(int bytecode[], int &index, int strLen = NULL) {
	if (!strLen) {
		strLen = getSizeT(bytecode, index);
	}

	int* strBytes = slice(bytecode, index, index + strLen);

	char* chars = new char[strLen];
	for (int i = 0; i < strLen; i++) {
		//std::cout << (char)strBytes[i] << std::endl;
		chars[i] = (char)strBytes[i];
	}

	delete[] strBytes;

	if (chars[strLen - 1] != 0) {
		chars[strLen] = 0;
	}

	std::string str = chars;

	index += strLen;
	return str;
}

void decodeChunk(int bytecode[], int &index) {
	std::string sourceName = getString(bytecode, index);
	std::cout << "Source name: " << sourceName << std::endl;

	int firstLine = getInt(bytecode, index);
	std::cout << "Line defined: " << firstLine << std::endl;

	int lastLine = getInt(bytecode, index);
	std::cout << "Last line defined: " << lastLine << std::endl;

	int upvalues = getInt8(bytecode, index);
	std::cout << "Number of upvalues: " << upvalues << std::endl;

	int parameters = getInt8(bytecode, index);
	std::cout << "Number of parameters: " << upvalues << std::endl;

	int vararg = getInt8(bytecode, index);
	std::cout << "Vararg flag: " << vararg << std::endl;

	int stackSize = getInt8(bytecode, index);
	std::cout << "Number of registers used: " << stackSize << std::endl;

	int instructions = getInt(bytecode, index);
	std::cout << "Number of instructions: " << instructions << std::endl;

	std::cout << "------------------------" << std::endl << "Instructions:" << std::endl;
	for (int i = 0; i < instructions; i++) {
		int data = getInt32(bytecode, index);
		int opcode = getBits(data, 1, 6);
		std::string opcodeName = luaOpcodeNames[opcode];
		std::string opcodeType = luaOpcodeTypes[opcode];

		int a = getBits(data, 7, 14);
		if (opcodeType == "ABC") {
			int b = getBits(data, 24, 32);
			int c = getBits(data, 15, 23);
			std::cout << "[" << i << "] " << opcodeName << " " << a << " " << b << " " << c << std::endl;
		} else if (opcodeType == "ABx") {
			int bx = getBits(data, 15, 23);
			std::cout << "[" << i << "] " << opcodeName << " " << a << " " << bx << std::endl;
		} else if (opcodeType == "AsBx") {
			int sbx = getBits(data, 15, 32) - 131071;
			std::cout << "[" << i << "] " << opcodeName << " " << a << " " << sbx << std::endl;
		}
	}
	std::cout << "------------------------" << std::endl;

	int constants = getInt(bytecode, index);
	std::cout << "Number of constants: " << constants << std::endl;

	std::cout << "------------------------" << std::endl << "Constants:" << std::endl;
	for (int i = 0; i < constants; i++) {
		int constType = getInt8(bytecode, index);

		if (constType == 1) {
			int constData = getInt8(bytecode, index) != 0;
			std::cout << "[" << i << "] " << constData << std::endl;
		}
		else if (constType == 3) {
			float constData = getFloat64(bytecode, index);
			std::cout << "[" << i << "] " << constData << std::endl;
		}
		else if (constType == 4) {
			std::string constData = getString(bytecode, index);
			std::cout << "[" << i << "] " << constData << std::endl;
		}
	}
	std::cout << "------------------------" << std::endl;

	int prototypes = getInt(bytecode, index);
	std::cout << "Number of prototypes: " << prototypes << std::endl;

	std::cout << "------------------------" << std::endl << "Prototypes:" << std::endl;
	for (int i = 0; i < prototypes; i++) {
		decodeChunk(bytecode, index);
	}
	std::cout << "------------------------" << std::endl;

	int lines = getInt(bytecode, index);
	std::cout << "Source line position list size: " << lines << std::endl;

	std::cout << "------------------------" << std::endl << "Source line positions:" << std::endl;
	for (int i = 0; i < lines; i++) {
		int sourceLinePosition = getInt(bytecode, index);
		std::cout << "[" << i << "] " << sourceLinePosition << std::endl;
	}
	std::cout << "------------------------" << std::endl;

	int locals = getInt(bytecode, index);
	std::cout << "Local list size: " << locals << std::endl;

	std::cout << "------------------------" << std::endl << "Locals:" << std::endl;
	for (int i = 0; i < locals; i++) {
		std::string name = getString(bytecode, index);
		int startScope = getInt(bytecode, index);
		int endScope = getInt(bytecode, index);

		std::cout << "[" << i << "] " << name << " " << startScope << " " << endScope << std::endl;
	}
	std::cout << "------------------------" << std::endl;

	int upvalueListSize = getInt(bytecode, index);
	std::cout << "Upvalue list size: " << upvalueListSize << std::endl;

	std::cout << "------------------------" << std::endl << "Upvalues:" << std::endl;
	for (int i = 0; i < upvalueListSize; i++) {
		std::string name = getString(bytecode, index);
		std::cout << "[" << i << "] " << name << std::endl;
	}
	std::cout << "------------------------" << std::endl;
}

void decodeBytecode(int bytecode[]) {
	int index = 1;

	std::string headerSignature = getString(bytecode, index, 3);
	std::cout << "Header signature: " << headerSignature << std::endl;

	int versionNumber = getInt8(bytecode, index);
	std::cout << "Version number: " << versionNumber << ", Hex: 0x" << std::hex << versionNumber << std::endl;

	int formatVersion = getInt8(bytecode, index);
	std::cout << "Format version: " << formatVersion << std::endl;

	int endiannessFlag = getInt8(bytecode, index);
	std::cout << "Endianness flag: " << endiannessFlag << std::endl;

	int intSize = getInt8(bytecode, index);
	std::cout << "Int size: " << intSize << std::endl;

	int sizeT = getInt8(bytecode, index);
	std::cout << "Size_T size: " << sizeT << std::endl;

	int instructionSize = getInt8(bytecode, index);
	std::cout << "Instruction size: " << instructionSize << std::endl;

	int luaNumberSize = getInt8(bytecode, index);
	std::cout << "Lua_Number size: " << luaNumberSize << std::endl;

	int integralFlag = getInt8(bytecode, index);
	std::cout << "Integral flag: " << integralFlag << std::endl;

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

int main() {
	decodeBytecode(bytecodeArray);
}
