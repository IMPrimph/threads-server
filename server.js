import express from 'express';
import dotenv from 'dotenv'
import { connectDB } from './db/connectDB.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

connectDB()

app.listen(PORT, () => {
    console.log('server started')
});