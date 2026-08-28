import express from 'express';
import cors from 'cors';
import filmRoutes from './routes/films.js';
import topRentedRoutes from './routes/topRented.js';
import customersRoutes from './routes/customers.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Sakila API running. Try /films, /customers, /top-rented');
});

app.use('/films',filmRoutes);
app.use('/top-rented',topRentedRoutes);
app.use('/customers',customersRoutes);

export default app;