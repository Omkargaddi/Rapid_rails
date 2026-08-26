CXX        = g++
CXXFLAGS   = -std=c++17 -O2 -Wall
DEP_PREFIX ?= /usr/local
INCLUDES   = -I$(DEP_PREFIX)/include
LIBS       = -L$(DEP_PREFIX)/lib -L$(DEP_PREFIX)/lib64 -lhiredis -lpthread

ENGINE_OBJ = bindings.cpp
WORKER_OBJ = worker.cpp
HEADERS    = EngineCommon.hpp GraphEngine.hpp DataModels.hpp StationManager.hpp json.hpp

.PHONY: all clean

all: ../train_engine ../train_worker

../train_engine: $(ENGINE_OBJ) $(HEADERS)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ $(ENGINE_OBJ) $(LIBS)

../train_worker: $(WORKER_OBJ) $(HEADERS)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ $(WORKER_OBJ) $(LIBS)

clean:
	rm -f ../train_engine ../train_worker