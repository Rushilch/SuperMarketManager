"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
const AppError_1 = require("../utils/AppError");
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errorMsg = result.error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            return next(new AppError_1.AppError(`Validation error: ${errorMsg}`, 400));
        }
        req.body = result.data;
        next();
    };
}
