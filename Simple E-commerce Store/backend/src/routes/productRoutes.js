const router = require('express').Router();
const { list, categories, getOne } = require('../controllers/productController');

router.get('/', list);
router.get('/categories', categories); // must come before '/:id'
router.get('/:id', getOne);

module.exports = router;
