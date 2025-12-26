#pragma once

// For WebAssembly builds we don't need DLL export/import attributes.
// libmysofa uses this header mainly for symbol visibility on Windows.

#define MYSOFA_EXPORT
#define MYSOFA_NO_EXPORT

#define MYSOFA_DEPRECATED
#define MYSOFA_DEPRECATED_EXPORT MYSOFA_EXPORT
#define MYSOFA_DEPRECATED_NO_EXPORT MYSOFA_NO_EXPORT
