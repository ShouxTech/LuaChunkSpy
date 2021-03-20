/*
GetFloat64 doesn't work.

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

using System;

namespace LuaChunkSpyCS {
    class Program {
        static int[] bytecodeArray = new int[259] {
            27, 76, 117, 97, 81, 0, 1, 4, 8, 4, 8, 0, 7, 0, 0, 0, 0, 0, 0, 0, 60, 101, 118, 97, 108, 62, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 4, 10, 0, 0, 0, 1, 0, 0, 0, 66, 0, 128, 0, 132, 0, 0, 0, 193, 64, 0, 0, 149, 192, 0, 1, 136, 0, 0, 0, 133, 128, 0, 0, 193, 192, 0, 0, 156, 64, 0, 1, 30, 0, 128, 0, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 36, 64, 4, 2, 0, 0, 0, 0, 0, 0, 0, 33, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 112, 114, 105, 110, 116, 0, 4, 14, 0, 0, 0, 0, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 110, 117, 109, 98, 101, 114, 0, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 98, 111, 111, 108, 0, 2, 0, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 117, 112, 118, 97, 108, 0
        };

        static string[] luaOpcodeTypes = {
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

        static string[] luaOpcodeNames = {
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

        static T[] Slice<T>(T[] data, int index, int length) {
            T[] sliced = new T[length];
            Array.Copy(data, index, sliced, 0, length);
            return sliced;
        }

        static int GetBits(int number, int n, int n2) {
            return (((1 << n2) - 1) & (number >> (n - 1)));
        }

        static int GetInt8(int[] bytecode, ref int index) {
            int[] bytes = Slice(bytecode, index, 1);
            int b0 = bytes[0];
            index++;
            return b0;
        }

        static int GetInt32(int[] bytecode, ref int index) {
            int[] bytes = Slice(bytecode, index, 4);
            index += 4;
            return bytes[3] * 16777216 + bytes[2] * 65536 + bytes[1] * 256 + bytes[0];
        }

        static int GetInt64(int[] bytecode, ref int index) {
            int a, b;
            a = GetInt32(bytecode, ref index);
            b = GetInt32(bytecode, ref index);
            return (int)(b * 4294967296) + a;
        }

        static int GetFloat64(int[] bytecode, ref int index) {
            int a, b;
            a = GetInt32(bytecode, ref index);
            b = GetInt32(bytecode, ref index);
            return (-2 * GetBits(b, 1, 32) + 1) * (2 ^ (GetBits(b, 21, 31) - 1023)) *
                ((GetBits(b, 1, 20) * (2 ^ 32) + a) / (2 ^ 52) + 1);
        }

        delegate int Get(int[] bytecode, ref int index);

        static Get GetInt;
        static Get GetSizeT;

        static string GetString(int[] bytecode, ref int index, int strLen = -1) {
            if (strLen == -1) {
                strLen = GetSizeT(bytecode, ref index);
            }

            int[] strBytes = Slice(bytecode, index, strLen);

            char[] chars = new char[strLen];
            for (int i = 0; i < strLen; i++) {
                chars[i] = Convert.ToChar(strBytes[i]);
            }

            string str = new string(chars);

            index += strLen;
            return str;
        }

        static void DecodeChunk(int[] bytecode, ref int index) {
            string sourceName = GetString(bytecode, ref index);
            Console.WriteLine("Source name: " + sourceName);

            int firstLine = GetInt(bytecode, ref index);
            Console.WriteLine("Line defined: " + firstLine);

            int lastLine = GetInt(bytecode, ref index);
            Console.WriteLine("Last line defined: " + lastLine);

            int upvalues = GetInt8(bytecode, ref index);
            Console.WriteLine("Number of upvalues: " + upvalues);

            int parameters = GetInt8(bytecode, ref index);
            Console.WriteLine("Number of parameters: " + upvalues);

            int vararg = GetInt8(bytecode, ref index);
            Console.WriteLine("Vararg flag: " + vararg);

            int stackSize = GetInt8(bytecode, ref index);
            Console.WriteLine("Number of registers used: " + stackSize);

            int instructions = GetInt(bytecode, ref index);
            Console.WriteLine("Number of instructions: " + instructions);

            Console.WriteLine("------------------------\nInstructions:");
            for (int i = 0; i < instructions; i++) {
                int data = GetInt32(bytecode, ref index);
                int opcode = GetBits(data, 1, 6);
                string opcodeName = luaOpcodeNames[opcode];
                string opcodeType = luaOpcodeTypes[opcode];

                int a = GetBits(data, 7, 14);
                if (opcodeType == "ABC") {
                    int b = GetBits(data, 24, 32);
                    int c = GetBits(data, 15, 23);
                    Console.WriteLine("[" + i + "] " + opcodeName + " " + a + " " + b + " " + c);
                } else if (opcodeType == "ABx") {
                    int bx = GetBits(data, 15, 23);
                    Console.WriteLine("[" + i + "] " + opcodeName + " " + a + " " + bx);
                } else if (opcodeType == "AsBx") {
                    int sbx = GetBits(data, 15, 32) - 131071;
                    Console.WriteLine("[" + i + "] " + opcodeName + " " + a + " " + sbx);
                }
            }
            Console.WriteLine("------------------------");

            int constants = GetInt(bytecode, ref index);
            Console.WriteLine("Number of constants: " + constants);

            Console.WriteLine("------------------------\nConstants:");
            for (int i = 0; i < constants; i++) {
                int constType = GetInt8(bytecode, ref index);

                if (constType == 1) {
                    bool constData = GetInt8(bytecode, ref index) != 0;
                    Console.WriteLine("[" + i + "] " + constData);
                } else if (constType == 3) {
                    float constData = GetFloat64(bytecode, ref index);
                    Console.WriteLine("[" + i + "] " + constData);
                } else if (constType == 4) {
                    string constData = GetString(bytecode, ref index);
                    Console.WriteLine("[" + i + "] " + constData);
                }
            }
            Console.WriteLine("------------------------");

            int prototypes = GetInt(bytecode, ref index);
            Console.WriteLine("Number of prototypes: " + prototypes);

            Console.WriteLine("------------------------\nPrototypes:");
            for (int i = 0; i < prototypes; i++) {
                DecodeChunk(bytecode, ref index);
            }
            Console.WriteLine("------------------------");

            int lines = GetInt(bytecode, ref index);
            Console.WriteLine("Source line position list size: " + lines);

            Console.WriteLine("------------------------\nSource line positions:");
            for (int i = 0; i < lines; i++) {
                int sourceLinePosition = GetInt(bytecode, ref index);
                Console.WriteLine("[" + i + "] " + sourceLinePosition);
            }
            Console.WriteLine("------------------------");

            int locals = GetInt(bytecode, ref index);
            Console.WriteLine("Local list size: " + locals);

            Console.WriteLine("------------------------\nLocals:");
            for (int i = 0; i < locals; i++) {
                string name = GetString(bytecode, ref index);
                int startScope = GetInt(bytecode, ref index);
                int endScope = GetInt(bytecode, ref index);

                Console.WriteLine("[" + i + "] " + name + " " + startScope + " " + endScope);
            }
            Console.WriteLine("------------------------");

            int upvalueListSize = GetInt(bytecode, ref index);
            Console.WriteLine("Upvalue list size: " + upvalueListSize);

            Console.WriteLine("------------------------\nUpvalues:");
            for (int i = 0; i < upvalueListSize; i++) {
                string name = GetString(bytecode, ref index);
                Console.WriteLine("[" + i + "] " + name);
            }
            Console.WriteLine("------------------------");
        }

        static void DecodeBytecode(int[] bytecode) {
            int index = 1;

            string headerSignature = GetString(bytecode, ref index, 3);
            Console.WriteLine("Header signature: " + headerSignature);

            int versionNumber = GetInt8(bytecode, ref index);
            Console.WriteLine("Version number: " + versionNumber + ", Hex: 0x" + versionNumber.ToString("X"));

            int formatVersion = GetInt8(bytecode, ref index);
            Console.WriteLine("Format version: " + formatVersion);

            int endiannessFlag = GetInt8(bytecode, ref index);
            Console.WriteLine("Endianness flag: " + endiannessFlag);

            int intSize = GetInt8(bytecode, ref index);
            Console.WriteLine("Int size: " + intSize);

            int sizeT = GetInt8(bytecode, ref index);
            Console.WriteLine("Size_T size: " + sizeT);

            int instructionSize = GetInt8(bytecode, ref index);
            Console.WriteLine("Instruction size: " + instructionSize);

            int luaNumberSize = GetInt8(bytecode, ref index);
            Console.WriteLine("Lua_Number size: " + luaNumberSize);

            int integralFlag = GetInt8(bytecode, ref index);
            Console.WriteLine("Integral flag: " + integralFlag);

            if (intSize == 4) {
                GetInt = GetInt32;
            } else if (intSize == 8) {
                GetInt = GetInt64;
            }

            if (sizeT == 4) {
                GetSizeT = GetInt32;
            } else if (sizeT == 8) {
                GetSizeT = GetInt64;
            }

            DecodeChunk(bytecode, ref index);
        }

        static void Main(string[] args) {
            DecodeBytecode(bytecodeArray);
            Console.ReadKey();
        }
    }
}
