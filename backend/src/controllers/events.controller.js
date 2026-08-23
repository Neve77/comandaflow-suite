const eventsService = require('../services/events.service');

const list = async (req, res, next) => {
  try {
    const events = await eventsService.listEvents();
    res.json({ events });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const data = await eventsService.getEventDashboard(req.validated.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const event = await eventsService.createEvent(req.validated);
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id, ...data } = req.validated;
    const event = await eventsService.updateEvent(id, data);
    res.json({ event });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await eventsService.removeEvent(req.validated.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { create, delete: remove, getDashboard, list, update };
