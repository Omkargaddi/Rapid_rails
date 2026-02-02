cmake_minimum_required(VERSION 3.16)
project(train_engine)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(train_engine SHARED
    cpp_src/bindings.cpp
)

# Include paths
target_include_directories(train_engine PRIVATE
    ${CMAKE_JS_INC}
    ${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api
    cpp_src
)

# Required for node-addon-api
add_definitions(-DNAPI_CPP_EXCEPTIONS)

set_target_properties(train_engine PROPERTIES
    PREFIX ""
    SUFFIX ".node"
)

target_link_libraries(train_engine ${CMAKE_JS_LIB})

if(MSVC)
    target_compile_options(train_engine PRIVATE /EHsc)
endif()
