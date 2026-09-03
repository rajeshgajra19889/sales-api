import { Router } from 'express';
import { getRentalsPerMonth, getStats, getTopCategories, getRecentRentals, getTopFilms, getTopFilmsByCategory } from '../services/dashboardService.js';

const router = Router();

router.get('/stats', async (_req, res) => {
    res.json(await getStats());
});

router.get('/rentals-per-month', async (_req, res) => {
    res.json(await getRentalsPerMonth());
});

router.get('/top-categories', async (_req, res) => {
    res.json(await getTopCategories(5));
});

router.get('/top-films', async (_req, res) => {
    res.json(await getTopFilms(5));
});

router.get('/top-categories-by-rentals', async (_req, res) => {
    res.json(await getTopFilmsByCategory(5));
});

router.get('/recent-rentals', async (_req, res) => {
    res.json(await getRecentRentals(8));
});

export default router;