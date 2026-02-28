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
<img width="1920" height="1080" alt="Screenshot From 2026-02-28 10-17-16" src="https://github.com/user-attachments/assets/9eb32cb2-9502-498e-a590-0e835120818b" />

</p>


### Journey Results

<p align="center">
 <img width="1920" height="1080" alt="Screenshot From 2026-02-27 17-31-33" src="https://github.com/user-attachments/assets/b44a48f0-9e4f-442a-a64d-356d950e13c7" />

</p>

<p align="center">
  <img width="1920" height="1080" alt="Screenshot From 2026-02-27 17-31-41" src="https://github.com/user-attachments/assets/dde5da12-2e37-45a7-af75-ca0d8159f35f" />

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
