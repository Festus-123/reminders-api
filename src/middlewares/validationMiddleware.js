// src/middlewares/validationMiddleware.js
import { ZodError } from 'zod';

export function validateData(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
        console.log("Error", error);
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const errorMessages = issues.map((issue) => ({
          message: `${issue.path.join('.')} is ${issue.message}`,
        }));
        res.status(400).json({ error: 'Invalid data', details: errorMessages });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}