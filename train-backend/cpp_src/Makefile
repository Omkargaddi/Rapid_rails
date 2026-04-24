CXX      = g++
CXXFLAGS = -std=c++17 -O2 -Wall
TARGET = ../train_engine
SRCS     = bindings.cpp

.PHONY: all clean

all: $(TARGET)

$(TARGET): $(SRCS) GraphEngine.hpp DataModels.hpp StationManager.hpp json.hpp
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRCS)

clean:
	rm -f $(TARGET)