const Joi =require("joi");
const validate=require("../utils/validate");

const screenSchema=Joi.object({
    name: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      "string.min": "Screen name cannot be empty",
      "string.max": "Screen name cannot exceed 50 characters",
      "any.required": "Screen name is required"
    }),

    theaterId: Joi.string()
    .hex()
    .length(24)
    .optional()
    .messages({
      "string.hex": "Invalid theater id",
      "string.length": "Invalid theater id"
    }),

    rows: Joi.array()
    .items(
      Joi.object({
        name: Joi.string()
          .uppercase()
          .required()
          .messages({
            "any.required": "Row name is required"
          }),
        type: Joi.string()
          .valid("regular", "premium", "vip")
          .required()
          .messages({
            "any.only": "Seat type must be regular, premium or vip",
            "any.required": "Seat type is required"
          })
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one row is required",
      "any.required": "Rows are required"
    }),

    layoutType: Joi.string()
    .valid("standard", "classic", "imax", "4dx")
    .required()
    .messages({
      "any.only": "Layout type must be standard, classic, imax or 4dx",
      "any.required": "Layout type is required"
    }),

    seatsPerRow: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .required()
    .messages({
      "number.min": "At least 1 seat per row is required",
      "number.max": "Cannot exceed 50 seats per row",
      "any.required": "Seats per row is required"
    })
});


exports.validateScreen = validate(screenSchema);