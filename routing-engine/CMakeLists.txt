cmake_minimum_required(VERSION 3.20)
project(railway_routing_engine CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()
set(CMAKE_CXX_FLAGS_RELEASE "-O2")
add_compile_options(-Wall -Wextra)

find_package(Threads REQUIRED)

add_library(rail_core STATIC src/timetable.cpp src/router.cpp src/journey_json.cpp)
target_include_directories(rail_core PUBLIC src)
target_include_directories(rail_core SYSTEM PUBLIC third_party)

add_executable(routing_engine src/server.cpp)
target_link_libraries(routing_engine PRIVATE rail_core Threads::Threads)

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/bench/bench.cpp")
  add_executable(bench bench/bench.cpp)
  target_link_libraries(bench PRIVATE rail_core)
endif()

option(RAIL_BUILD_TESTS "Build tests" ON)
if(RAIL_BUILD_TESTS AND EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/tests/test_main.cpp")
  enable_testing()
  add_executable(engine_tests tests/test_main.cpp tests/test_time.cpp tests/test_router.cpp tests/test_oracle.cpp tests/test_dataset.cpp tests/test_compact.cpp)
  target_link_libraries(engine_tests PRIVATE rail_core)
  target_compile_definitions(engine_tests PRIVATE RAIL_DATA_DIR="${CMAKE_CURRENT_SOURCE_DIR}/../data/processed")
  add_test(NAME engine_tests COMMAND engine_tests)
endif()
