import app from "./app/app.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Reminder Api working on port ${PORT}`));
