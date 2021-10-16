import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import { categorieSchema } from './joiSchemas.js'

dotenv.config()
const { Pool } = pg;
const routes = Router();

const connection = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
})

routes.get("/categories", async (req, res) => {
    try {
        const result = await connection.query('SELECT * FROM categories')
        res.json(result.rows) //when i want to send an array, should the res.json be used?
    } catch(e) {
        console.log("ERRO GET /categories");
        console.log(e)
        res.sendStatus(500)
    }
})

routes.post("/categories", async (req, res) => {
    try {
        const isValid = !categorieSchema.validate(req.body).error
        const exists = await connection.query(`SELECT * FROM categories WHERE name = $1`,
            [req.body.name.toLowerCase()])

        if(exists.rows.length > 0) {
            res.sendStatus(409)
            return;
        }

        if(isValid) {
            await connection.query(`INSERT INTO categories (name) VALUES ($1)`,
                [req.body.name.toLowerCase()])

            res.sendStatus(201)
            return;
        }
        res.sendStatus(422)
    } catch (e) {
        console.log("ERRO POST /categories")
        console.log(e)
        res.sendStatus(500)
    }
})

export default routes;