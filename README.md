# RapidRails - Train Route Optimization System

<p align="center">
<img width="550" height="159" alt="logo2" src="https://github.com/user-attachments/assets/1253fe89-ad5f-40bc-8942-f2a42d675d2a" />
</p>


##  Problem Statement

Traditional train route planners face several limitations:

- Difficulty handling multi-leg journeys with multiple transfers  
- Lack of realistic layover constraints  
- Fragmented schedule data (PDFs, text files)  
- Poor performance when traversing large multi-hop graphs  

RapidRails solves these using:

- Optimized shortest-path algorithm

## Application Screenshots

### Route Search Interface

<p align="center">
<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/9a351b28-9bf8-4698-aeb7-d9ffc61d44d2" />


</p>


### Journey Results

<p align="center">
<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/b90f16e5-8303-47c9-bd9c-a5de6f89ee49" />

</p>

<p align="center">
<img width="1920" height="909" alt="image" src="https://github.com/user-attachments/assets/d006b8d2-2f78-4184-93c2-f2f0fc7db775" />


</p>


## Core Engine/Algo

RapidRails uses a **modified Dijkstra’s Algorithm**. The routing engine is implemented in **C++17** for maximum performance and low-latency computations.

## Tech Stack

### Backend
- **C++ (C++17)** – High-performance routing engine  
- **Node.js** – API layer  
- **Express.js** – REST API framework  
- **MongoDB** – User data & saved journeys  

### Frontend
- **React.js**  
- **Tailwind CSS**

### Libraries

**C++**
- `cpp-httplib`
- `nlohmann/json`

**Node.js**
- `jsonwebtoken`
- `bcrypt`


## Getting Started

###  Clone the Repository

```bash
git clone https://github.com/your-username/RapidRails.git
cd RapidRails
```


### Setup Backend (Node.js)

```bash
cd backend
npm install
npm start
```

### Compile C++ Engine

```bash
cd engine
g++ -std=c++17 main.cpp -o rapidrails
./rapidrails
```


### Setup Frontend

```bash
cd frontend
npm install
npm run dev
```


## Use Cases

- Smart railway search engines  
- Logistics & route planning systems  
- Academic demonstrations of graph algorithms  
- High-performance routing platforms  


## License

This project is open for educational and demonstration purposes.


## Author

**Omkar Gaddi**  
Engineering Student – IIIT Lucknow  
