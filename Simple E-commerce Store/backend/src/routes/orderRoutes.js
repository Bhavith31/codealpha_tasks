const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { create, listMine, getOne } = require('../controllers/orderController');

router.use(requireAuth); // every order route needs a logged-in user
router.post('/', create);
router.get('/', listMine);
router.get('/:id', getOne);

module.exports = router;
