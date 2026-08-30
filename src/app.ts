import express from 'express';
import cors from 'cors';
import filmRoutes from './routes/films.js';
import topRentedRoutes from './routes/topRented.js';
import customersRoutes from './routes/customers.js';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import dashboardRoutes from './controllers/dashboardController.js';
import actorRoutes from './routes/actors.js';
import rentalRoutes from './routes/rentals.js';
import inventoryRoutes from './routes/inventory.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Sakila API running. Try /films, /customers, /top-rented');
});

app.use('/auth', authRoutes);
app.use('/films', requireAuth, filmRoutes);
app.use('/top-rented', requireAuth, topRentedRoutes);
app.use('/customers', requireAuth, customersRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);
app.use('/actors', requireAuth, actorRoutes);
app.use('/rentals', requireAuth, rentalRoutes);
app.use('/inventory', requireAuth, inventoryRoutes);

export default app;