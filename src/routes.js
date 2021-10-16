import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import {
    categorieSchema,
    gameSchema
} from './joiSchemas.js'

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
        const dbResponse = await connection.query('SELECT * FROM categories;')
        return res.json(dbResponse.rows) //when i want to send an array, should the res.json be used?
    } catch(e) {
        console.log("ERRO GET /categories");
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.post("/categories", async (req, res) => {
    try {
        const isValid = !categorieSchema.validate(req.body).error
        if(!isValid) return res.sendStatus(422)

        const exists = await connection.query('SELECT * FROM categories WHERE name iLIKE $1;',
            [req.body.name])
        if(exists.rows.length > 0) return res.sendStatus(409)

        await connection.query('INSERT INTO categories (name) VALUES ($1);',
            [req.body.name])

        return res.sendStatus(201)
    } catch (e) {
        console.log("ERRO POST /categories")
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.get("/games", async (req, res) => {
    try {
        const { name } = req.query
        if(name) {
            const dbResponse = await connection.query(
                'SELECT * FROM games WHERE name iLIKE $1',
                [name+"%"]
            )
            return res.json(dbResponse.rows)
        }

        const dbResponse = await connection.query('SELECT * FROM games')
        return res.json(dbResponse.rows)
    } catch(e) {
        console.log("ERRO GET /games")
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.post("/games", async (req, res) => {
    try {
        const isValid = !gameSchema.validate(req.body).error
        if(!isValid) return res.sendStatus(400)

        const {
            name,
            image,
            stockTotal,
            categoryId,
            pricePerDay
        } = req.body

        const categoriesFound = connection.query('SELECT * FROM categories WHERE id = $1;',
            [req.body.categoryId])
        const nameFound = connection.query('SELECT * FROM games WHERE name = $1;',
            [req.body.name])

        const dbConnections = await Promise.all([ categoriesFound, nameFound ])

        if(dbConnections[0].rows.length === 0) return res.sendStatus(400)
        if(dbConnections[1].rows.length > 0) return res.sendStatus(409)

        await connection.query(
            `INSERT INTO games 
                (name, image, "stockTotal", "categoryId", "pricePerDay")
             VALUES
                ($1, $2, $3, $4, $5);`,
            [name, image, stockTotal, categoryId, pricePerDay]
        )

        return res.sendStatus(201)

    } catch(e) {
        console.log("ERRO POST /games")
        console.log(e)
        res.sendStatus(500)
    }
})

routes.get("/customers", async (req, res) => {
    try {
        const { cpf } = req.query
        if(cpf) {
            const dbResponse = await connection.query(
                'SELECT * FROM customers WHERE cpf iLIKE $1',
                [cpf+"%"]
            )
            return res.send(dbResponse.rows)
        }

        const dbResponse = await connection.query('SELECT * FROM customers')
        return res.send(dbResponse.rows)
    } catch(e) {
        console.log("ERRO GET /customers");
        console.log(e)
        return res.sendStatus(500)
    }
})
export default routes;