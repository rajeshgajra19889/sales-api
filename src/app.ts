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
import storesRoutes from './routes/stores.js'
import holdsRoutes from './routes/holds.js';
import waitlistRoutes from './routes/waitlist.js';
import addressesRoutes from './routes/addresses.js';
import citiesRoutes from './routes/cities.js';
import staffRoutes from './routes/staff.js';
import languageRoutes from './routes/languages.js'
import paymentRoutes from './routes/payments.js';
import revenueRoutes from './routes/revenue.js';

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
app.use('/stores', requireAuth, storesRoutes);
app.use('/holds', requireAuth, holdsRoutes);
app.use('/waitlist', requireAuth, waitlistRoutes);
app.use('/addresses', requireAuth, addressesRoutes);
app.use('/cities', requireAuth, citiesRoutes);
app.use('/staff', requireAuth, staffRoutes);
app.use('/languages', requireAuth, languageRoutes);
app.use('/payments', requireAuth, paymentRoutes);
app.use('/revenue', requireAuth, revenueRoutes);

export default app;