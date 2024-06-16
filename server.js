import express from 'express';
import dotenv from 'dotenv'
import { connectDB } from './db/connectDB.js';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

connectDB()

app.use(express.json()); // to parse json data into body
app.use(express.urlencoded({ extended: true })); // to parse form data into body
app.use(cookieParser());

app.use('/api/users', userRoutes);

app.listen(PORT, () => {
    console.log('server started')
});