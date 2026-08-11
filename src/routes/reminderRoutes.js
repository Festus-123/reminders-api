import { Router } from "express";

const router = Router()

router.get('/', (req, res) => {res.send('Get all reminders')})

router.get('/:id', (req, res) => {res.send('Get signle reminder by id')})

router.post('/', (req, res) => {res.send('Create a new reminder')})

router.patch('/:id', (req, res) => {
  res.send('Update some fields for existing reminder');
});

router.delete('/:id', (req, res) => {
  res.send('Delete a reminder');
});

export default router;