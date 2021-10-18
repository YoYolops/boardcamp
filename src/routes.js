import { Router } from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import {
    categorieSchema,
    gameSchema,
    customerSchema,
    rentalSchema
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
                'SELECT * FROM games WHERE name iLIKE $1;',
                [name+"%"]
            )
            return res.json(dbResponse.rows)
        }

        const dbResponse = await connection.query('SELECT * FROM games;')
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
                'SELECT * FROM customers WHERE cpf iLIKE $1;',
                [cpf+"%"]
            )
            return res.send(dbResponse.rows)
        }

        const dbResponse = await connection.query('SELECT * FROM customers;')
        return res.send(dbResponse.rows)
    } catch(e) {
        console.log("ERRO GET /customers");
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.get("/customers/:id", async (req, res) => {
    try {
        const { id } = req.params
        const dbResponse = await connection.query('SELECT * FROM customers WHERE id = $1;', [id])
        if(dbResponse.rows.length === 0) return res.sendStatus(404)
        return res.json(dbResponse.rows[0])
    } catch(e) {
        console.log("ERRO GET /customers:id")
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.post("/customers", async (req, res) => {
    try {
        const isValid = !customerSchema.validate(req.body).error
        if(!isValid) return res.sendStatus(400)

        const {
            name,
            phone,
            cpf,
            birthday
        } = req.body;

        const cpfFound = await connection.query('SELECT * FROM customers WHERE cpf = $1;', [cpf])
        if(cpfFound.rows.length > 0) return res.sendStatus(409)

        await connection.query(
            `INSERT INTO customers
                (name, phone, cpf, birthday)
             VALUES
                ($1, $2, $3, $4);`,
            [name, phone, cpf, birthday]
        )
        return res.sendStatus(201)
    } catch(e) {
        console.log("ERRO POST /customers")
        console.log(e)
        res.sendStatus(500)
    }
})

routes.put("/customers/:id", async (req, res) => {
    try {
        const {
            name,
            phone,
            cpf,
            birthday
        } = req.body
        const { id } = req.params

        const idFound = connection.query('SELECT * FROM customers WHERE id = $1;', [id])
        const cpfFound = connection.query('SELECT * FROM customers WHERE cpf = $1;', [cpf])

        const results = await Promise.all([ idFound, cpfFound ])
        if(results[0].rows.length === 0) return res.sendStatus(400)
        if(results[1].rows.length > 0 && results[1].rows[0].id != id) return res.sendStatus(409)

        await connection.query(
           `UPDATE 
                customers
            SET
                name = $2,
                phone = $3,
                cpf = $4,
                birthday = $5
            WHERE 
                id = $1;`,
            [id, name, phone, cpf, birthday]
        )

        return res.sendStatus(201)
    } catch(e) {
        console.log("ERRO PUT /customers")
        console.log(e)
        res.sendStatus(500)
    }
})

routes.get("/rentals", async (req, res) => {
    try {
        const { customerId, gameId } = req.query

        const query = `
                SELECT 
                    rentals.*,
                    customers.id AS customer_id,
                    customers.name AS customer_name,
                    games.id AS game_id,
                    games.name AS game_name,
                    categories.id AS category_id,
                    categories.name AS category_name
                FROM 
                    rentals
                JOIN 
                    customers ON rentals."customerId" = customers.id
                JOIN
                    games ON rentals."gameId" = games.id
                JOIN
                    categories ON games."categoryId" = categories.id
            ;`

        const dbResponse = await connection.query(query)
        let rentalsArray = dbResponse.rows

        if(customerId) {
            rentalsArray = rentalsArray.filter(obj => obj.customerId === Number(customerId))
        }
        if(gameId) {
            rentalsArray = rentalsArray.filter(obj => obj.gameId === Number(gameId))
        }

        const finalResponse = rentalsArray.map(obj => ({
            id: obj.id,
            customerId: obj.customerId,
            gameId: obj.gameId,
            rentDate: obj.rentDate,
            daysRented: obj.daysRented,
            returnDate: obj.returnDate,
            originalPrice: obj.originalPrice,
            delayFee: obj.delayFee,
            customer: {
                id: obj.customer_id,
                name: obj.customer_name
            },
            game: {
                id: obj.game_id,
                name: obj.game_name,
                categoryId: obj.category_id,
                categoryName: obj.category_name
            }
        }))
        return res.send(finalResponse)
    } catch(e) {
        console.log("ERRO GET /rentals")
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.post("/rentals", async (req, res) => {
    try {
        const isValid = !rentalSchema.validate(req.body).error
        if(!isValid) return res.sendStatus(400)

        const {
            customerId,
            gameId,
            daysRented
        } = req.body

        const customerFound = connection.query('SELECT * FROM customers WHERE id = $1;', [customerId])
        const gameFound = connection.query('SELECT * FROM games WHERE id = $1;', [gameId])
        const rentedGamesFound = connection.query('SELECT * FROM rentals WHERE "gameId" = $1;', [gameId])
        const results = await Promise.all([ customerFound, gameFound, rentedGamesFound ])        
        if(results[0].rows.length === 0 ||
           results[1].rows.length === 0 ||
           results[2].rows.length >= results[1].rows[0].stockTotal ) return res.sendStatus(400)


        const rentDate = dayjs().format('YYYY-MM-DD');
        const originalPrice = Number(daysRented) * Number(results[1].rows[0].pricePerDay)

        await connection.query(`
            INSERT INTO rentals 
                ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
            VALUES
                ($1, $2, $3, $4, NULL, $5, NULL);`,
            [customerId, gameId, rentDate, daysRented, originalPrice]   
        )

        return res.sendStatus(201)
    } catch(e) {
        console.log("ERRO POST /rentals")
        console.log(e)
        return res.sendStatus(500)
    }
})

routes.post("/rentals/:id/return", async (req, res) => {
    try {
        const { id } = req.params
        const dbResponse = await connection.query('SELECT * FROM rentals WHERE id = $1', [id])

        if(dbResponse.rows.length === 0) return res.sendStatus(404)
        if(dbResponse.rows[1].returnDate !== null) return sendStatus(400)

        const rentalObject = dbResponse.rows[1]

        const returnDate = dayjs()
        const rentDateObject = dayjs(rentalObject.rentDate, 'YYYY-MM-DD')
        const delayFee = (Math.floor((returnDate - rentDateObject)/(60*60*24*1000))) * (rentalObject.originalPrice/rentalObject.daysRented)

        await connection.query(
            `UPDATE 
                rentals
             SET
                "delayFee" = $1,
                "returnDate" = $2
             WHERE
                id = $3`,
            [delayFee, returnDate.format('YYYY-MM-DD'), id]
        )

        return res.sendStatus(200)
    } catch(e) {
        console.log("ERRO POST /rentals/:id/return")
        console.log(e)
        return res.sendStatus(500)
    }
})


routes.delete("/rentals/:id", async (req, res) => {
    try {
        const { id } = req.params
        const idFound = await connection.query('SELECT * FROM rentals WHERE id = $1;', [id])
        if(idFound.rows.length === 0 ) return res.sendStatus(404)
        if(idFound.rows[0].returnDate !== null) return res.sendStatus(400)

        await connection.query('DELETE FROM rentals WHERE id = $1;', [id])
        return res.sendStatus(200)
    } catch(e) {
        console.log("ERRO DELETE /rentals/:id")
        console.log(e)
        return res.sendStatus(500)
    }
})
export default routes;