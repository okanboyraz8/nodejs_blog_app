const express = require('express');
const Post = require('../models/Post')
const router = express.Router();

// GET
// Index
router.get('', async (req, res) => {

    try {
        let pageQuantity = 3;
        let page = req.query.page || 1;
        const data = await Post.aggregate([{ $sort: { createdAt: -1 } }])
            .skip(pageQuantity * page - pageQuantity)
            .limit(pageQuantity)
            .exec()

        const count = await Post.count();
        const nextPage = parseInt(page) + 1;
        const nextPageControl = nextPage <= Math.ceil(count / pageQuantity);

        res.render('index', { data, currrent: page, nextPage: nextPageControl ? nextPage : null })

    } catch (error) {
        console.log(error);
    }

})

// GET
// About
router.get('/about', (req, res) => {
    res.render('about')
})

// GET
// Post Detail
router.get('/post/:id', async (req, res) => {

    try {
        let slug = req.params.id;
        const data = await Post.findById({_id: slug});

        res.render('post', {data})
        
    } catch (error) {
        console.log(error);        
    }

})

// POST
// Search
router.post('/search', async (req, res) => {

    try {
        let searchText = req.body.searchInput;

        const data = await Post.find({
            $or: [
                {title: searchText},
                {body: searchText}
            ]
        })

        console.log("data", data);

        res.render('searchResult', {data})
        
    } catch (error) {
        console.log(error);
    }

})

// function PostAdd() {
//     Post.insertMany([
//         {
//             title: 'Fifth Post',
//             body: 'blog description'
//         }
//     ])
// }
// PostAdd();

module.exports = router;