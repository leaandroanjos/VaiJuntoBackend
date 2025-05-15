import dotenv from 'dotenv';
import userController from './controllers/userController'
import quadraController from './controllers/quadraController'
import eventoController from './controllers/eventosController'
import cors from 'cors';
import path from 'path';

dotenv.config();

const express = require("express");
const app = express();

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(cors());
app.get("/", (req: any, res: any) => res.send(`Express on Vercel`));

// ✅ Adiciona suporte a JSON no body das requisições
app.use(express.json());

app.use(userController);
app.use(quadraController);
app.use(eventoController);

app.listen(3000, () => console.log("Server ready on port 3000."));

//module.exports = app;