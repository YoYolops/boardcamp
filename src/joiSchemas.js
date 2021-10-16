import joi from 'joi';

export const categorieSchema = joi.object({
    name: joi.string().required()
})

export const gameSchema = joi.object({
    name: joi.string().required(),
    image: joi.string(),
    stockTotal: joi.number().min(1).required(),
    categoryId: joi.number().required(),
    pricePerDay: joi.number().min(1).required()
})

export const customerSchema = joi.object({
    name: joi.string().min(1).required(),
    phone: joi.string().min(10).max(11).required(),
    cpf: joi.string().min(11).required(),
    birthday: joi.string().required().pattern(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/)
})

export const rentalSchema = joi.object({
    customerId: joi.number().required(),
    gameId: joi.number().required(),
    daysRented: joi.number().min(1).required()
})