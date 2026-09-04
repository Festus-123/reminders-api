import app from "./app/app.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Reminder Api working on port ${PORT}`));
