/*
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
#include <vector>

std::vector<std::uint8_t> bytecode_array = {
	27, 76, 117, 97, 81, 0, 1, 4, 8, 4, 8, 0, 7, 0, 0, 0, 0, 0, 0, 0, 60, 101, 118, 97, 108, 62, 0, 3, 0, 0, 0, 8, 0, 0, 0, 1, 0, 0, 4, 10, 0, 0, 0, 1, 0, 0, 0, 66, 0, 128, 0, 132, 0, 0, 0, 193, 64, 0, 0, 149, 192, 0, 1, 136, 0, 0, 0, 133, 128, 0, 0, 193, 192, 0, 0, 156, 64, 0, 1, 30, 0, 128, 0, 4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 36, 64, 4, 2, 0, 0, 0, 0, 0, 0, 0, 33, 0, 4, 6, 0, 0, 0, 0, 0, 0, 0, 112, 114, 105, 110, 116, 0, 4, 14, 0, 0, 0, 0, 0, 0, 0, 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33, 0, 0, 0, 0, 0, 10, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 110, 117, 109, 98, 101, 114, 0, 1, 0, 0, 0, 9, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 98, 111, 111, 108, 0, 2, 0, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 117, 112, 118, 97, 108, 0
};

std::string opcode_types[] = {
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

std::string opcode_names[] = {
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

int (*get_int)(const std::vector<std::uint8_t>& bytecode, int& index);
int (*get_size_t)(const std::vector<std::uint8_t>& bytecode, int& index);

int get_int8(const std::vector<std::uint8_t>& bytecode, int& index) {
	int res = bytecode[index];
	index++;
	return res;
}

int get_int32(const std::vector<std::uint8_t>& bytecode, int& index) {
	int res = *(int*)(&bytecode[index]);
	index += 4;
	return res;
}

int get_int64(const std::vector<std::uint8_t>& bytecode, int& index) {
	int a, b;
	a = get_int32(bytecode, index);
	b = get_int32(bytecode, index);
	return b * 4294967296 + a;
}

float get_float64(const std::vector<std::uint8_t>& bytecode, int& index) {
	double res = *(double*)(&bytecode[index]);
	index += 8;
	return res;
}

std::string get_string(const std::vector<std::uint8_t>& bytecode, int& index, int length = 0) {
	if (!length) {
		length = get_size_t(bytecode, index);
	}

	std::string res(reinterpret_cast<const char*>(&bytecode[index]), length);
	index += length;
	return res;
}

void decode_chunk(const std::vector<std::uint8_t>& bytecode, int& index) {
	std::string source_name = get_string(bytecode, index);
	std::cout << "Source name: " << source_name << '\n';

	int first_line = get_int(bytecode, index);
	std::cout << "Line defined: " << first_line << '\n';

	int last_line = get_int(bytecode, index);
	std::cout << "Last line defined: " << last_line << '\n';

	int upvalues = get_int8(bytecode, index);
	std::cout << "Number of upvalues: " << upvalues << '\n';

	int parameters = get_int8(bytecode, index);
	std::cout << "Number of parameters: " << parameters << '\n';

	int vararg = get_int8(bytecode, index);
	std::cout << "Vararg flag: " << vararg << '\n';

	int stack_size = get_int8(bytecode, index);
	std::cout << "Number of registers used: " << stack_size << '\n';

	int instructions = get_int(bytecode, index);
	std::cout << "Number of instructions: " << instructions << '\n';

	std::cout << "------------------------\n" << "Instructions:" << '\n';
	for (int i = 0; i < instructions; i++) {
		int data = get_int32(bytecode, index);
		int opcode = data & 0x3F;
		std::string opcode_name = opcode_names[opcode];
		std::string opcode_type = opcode_types[opcode];

		int a = (data >> 6) & 0xFF;
		int b = (data >> 23) & 0x1FF;
		int c = (data >> 14) & 0x1FF;
		if (opcode_type == "ABC") {
			std::cout << "[" << i << "] " << opcode_name << " " << a << " " << b << " " << c << '\n';
		} else if (opcode_type == "ABx") {
			int bx = ((b << 9) & 0xFFE00 | c) & 0x3FFFF;
			std::cout << "[" << i << "] " << opcode_name << " " << a << " " << bx << '\n';
		} else if (opcode_type == "AsBx") {
			int bx = ((b << 9) & 0xFFE00 | c) & 0x3FFFF;
			int sbx = bx - 131071;
			std::cout << "[" << i << "] " << opcode_name << " " << a << " " << sbx << '\n';
		}
	}
	std::cout << "------------------------\n";

	int constants = get_int(bytecode, index);
	std::cout << "Number of constants: " << constants << '\n';

	std::cout << "------------------------\n" << "Constants:" << '\n';
	for (int i = 0; i < constants; i++) {
		int constType = get_int8(bytecode, index);

		if (constType == 1) {
			int const_data = get_int8(bytecode, index) != 0;
			std::cout << "[" << i << "] " << const_data << '\n';
		} else if (constType == 3) {
			float const_data = get_float64(bytecode, index);
			std::cout << "[" << i << "] " << const_data << '\n';
		} else if (constType == 4) {
			std::string const_data = get_string(bytecode, index);
			std::cout << "[" << i << "] " << const_data << '\n';
		}
	}
	std::cout << "------------------------\n";

	int prototypes = get_int(bytecode, index);
	std::cout << "Number of prototypes: " << prototypes << '\n';

	std::cout << "------------------------\n" << "Prototypes:" << '\n';
	for (int i = 0; i < prototypes; i++) {
		decode_chunk(bytecode, index);
	}
	std::cout << "------------------------\n";

	int lines = get_int(bytecode, index);
	std::cout << "Source line position list size: " << lines << '\n';

	std::cout << "------------------------\n" << "Source line positions:" << '\n';
	for (int i = 0; i < lines; i++) {
		int source_line_position = get_int(bytecode, index);
		std::cout << "[" << i << "] " << source_line_position << '\n';
	}
	std::cout << "------------------------\n";

	int locals = get_int(bytecode, index);
	std::cout << "Local list size: " << locals << '\n';

	std::cout << "------------------------\n" << "Locals:" << '\n';
	for (int i = 0; i < locals; i++) {
		std::string name = get_string(bytecode, index);
		int start_scope = get_int(bytecode, index);
		int end_scope = get_int(bytecode, index);

		std::cout << "[" << i << "] " << name << " " << start_scope << " " << end_scope << '\n';
	}
	std::cout << "------------------------\n";

	int upvalue_list_size = get_int(bytecode, index);
	std::cout << "Upvalue list size: " << upvalue_list_size << '\n';

	std::cout << "------------------------\n" << "Upvalues:" << '\n';
	for (int i = 0; i < upvalue_list_size; i++) {
		std::string name = get_string(bytecode, index);
		std::cout << "[" << i << "] " << name << '\n';
	}
	std::cout << "------------------------\n";
}

void decode_bytecode(const std::vector<std::uint8_t>& bytecode) {
	int index = 1;

	std::string header_signature = get_string(bytecode, index, 3);
	std::cout << "Header signature: " << header_signature << '\n';

	int version_number = get_int8(bytecode, index);
	std::cout << "Version number: " << version_number << ", Hex: 0x" << std::hex << version_number << '\n';

	int format_version = get_int8(bytecode, index);
	std::cout << "Format version: " << format_version << '\n';

	int endianness_flag = get_int8(bytecode, index);
	std::cout << "Endianness flag: " << endianness_flag << '\n';

	int int_size = get_int8(bytecode, index);
	std::cout << "Int size: " << int_size << '\n';

	int size_t_size = get_int8(bytecode, index);
	std::cout << "Size_T size: " << size_t_size << '\n';

	int instruction_size = get_int8(bytecode, index);
	std::cout << "Instruction size: " << instruction_size << '\n';

	int lua_number_size = get_int8(bytecode, index);
	std::cout << "Lua_Number size: " << lua_number_size << '\n';

	int integral_flag = get_int8(bytecode, index);
	std::cout << "Integral flag: " << integral_flag << '\n';

	if (int_size == 4) {
		get_int = get_int32;
	} else if (int_size == 8) {
		get_int = get_int64;
	}

	if (size_t_size == 4) {
		get_size_t = get_int32;
	} else if (size_t_size == 8) {
		get_size_t = get_int64;
	}

	decode_chunk(bytecode, index);
}

int main() {
	decode_bytecode(bytecode_array);
}
