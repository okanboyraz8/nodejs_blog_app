const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

const { dirname, extname } = require('path');
const { uuid } = require('uuidv4');

const Post = require('../models/Post');
const User = require('../models/User');
const Log = require('../models/Log');

const adminLayout = '../views/layouts/admin';

const authMiddleware = (req, res, next) => {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized Entry' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized Entry' });
    }

}

router.get('/admin', (req, res) => {

    const token = req.cookies.token;

    const message = null;

    if (!token) {
        res.render('admin/index', { message })
    } else {
        res.render('/dashboard')
    }
})

router.post('/admin', async (req, res) => {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    let message = null;

    if (!user) {
        //return res.status(401).json({message:'Invalid Login Information'});
        message = 'Invalid Login Information - No User Found'
        return res.render('admin/index', { message })
    }

    const passwordCheck = await bcrypt.compare(password, user.password);

    if (!passwordCheck) {
        //return res.status(401).json({message:'Invalid Login Information'});
        message = 'Invalid Login Information - Password does not matched!'
        return res.render('admin/index', { message })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET)
    res.cookie('token', token, { httpOnly: true });

    //res.send('Login has occurred')
    res.redirect('/dashboard');
})


router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        let message = null;

        try {
            const user = await User.create({ username, password: hashedPassword });
            // res.status(201).json({ message: 'User Created', user });

            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET)
            res.cookie('token', token, { httpOnly: true });
            res.redirect('/dashboard');

        } catch (error) {
            if (error.code === 11000) {
                //res.status(409).json({message:'Username already taken'});
                message = 'Username already taken'
                return res.render('admin/register', { message })
            }

            // res.status(500).json({message:'Server error occurred'});
            message = 'Server error occurred'
            return res.render('admin/register', { message })
        }

    } catch (error) {
        console.log(error);
    }
})

router.get('/dashboard', authMiddleware, async (req, res) => {

    try {
        const data = await Post.find().sort({ createdAt: -1 })

        const userId = req.userId;

        const user = await User.findOne({ _id: userId });

        res.render('admin/dashboard', { data, layout: adminLayout, user: user.username });
    } catch (error) {
        console.log(error);
    }

})

router.get('/add-post', authMiddleware, async (req, res) => {

    try {

        const message = null;

        res.render('admin/add-post', { message, layout: adminLayout });
    } catch (error) {
        console.log(error);
    }

})

router.post('/add-post', authMiddleware, async (req, res) => {

    try {

        // console.log("req.files", req.files); // {postImage} found from console.log(req.files);
        const { postImage } = req.files;

        // console.log(postImage.mimetype);
        if (postImage.mimetype === 'image/jpeg' || postImage.mimetype === 'image/png') {

            const appDir = dirname(require.main.filename);

            // console.log("appDir", appDir);

            const uniqueName = uuid() + extname(postImage.name);

            const postImageUrl = appDir + '/public/img/' + uniqueName;

            await postImage.mv(postImageUrl);

            const newPost = new Post({
                title: req.body.title,
                body: req.body.body,
                imageUrl: '/img/' + uniqueName
            })

            await Post.create(newPost);

            const user = await User.findById(req.userId);

            const newLog = new Log({
                method: 'POST',
                id: newPost._id,
                username: user.username,
                oldValue: null
            })

            await Log.create(newLog);

            res.redirect('dashboard')
        } else {
            message = 'Please, choose a file with jpeg or png extension...'
            return res.render('admin/add-post', { message })
        }

    } catch (error) {
        console.log(error);
    }

})

router.get('/edit-post/:id', authMiddleware, async (req, res) => {

    try {
        const data = await Post.findOne({ _id: req.params.id })
        res.render('admin/edit-post', { data, layout: adminLayout });
    } catch (error) {
        console.log(error);
    }

})

router.put('/edit-post/:id', authMiddleware, async (req, res) => {

    try {

        const oldPost = await Post.findById(req.params.id)

        await Post.findByIdAndUpdate(req.params.id, {
            title: req.body.title,
            body: req.body.body
        })

        const user = await User.findById(req.userId);

        const newLog = new Log({
            method: 'PUT',
            id: req.params.id,
            username: user.username,
            oldValue: oldPost
        })

        await Log.create(newLog)

        res.redirect(`../post/${req.params.id}`);
    } catch (error) {
        console.log(error);
    }

})

router.delete('/delete-post/:id', authMiddleware, async (req, res) => {

    try {

        const oldPost = await Post.findById(req.params.id);

        await Post.deleteOne({ _id: req.params.id });

        const user = await User.findById(req.userId);

        const newLog = new Log({
            method: 'DELETE',
            id: req.params.id,
            username: user.username,
            oldValue: oldPost
        })

        await Log.create(newLog)

        res.redirect('/dashboard');
    } catch (error) {
        console.log(error);
    }

})

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/')
})

router.get('/register', (req, res) => {
    const message = null;
    res.render('admin/register', { message })
})

router.get('/profile', authMiddleware, async (req, res) => {

    try {
        const user = await User.findById(req.userId);

        const logs = await Log.find({ username: user.username }).sort({ createdAt: -1 }).
            limit(20);

        res.render('admin/profile', { user, layout: adminLayout, logs })
    } catch (error) {
        console.log(error);
    }

})

router.post('/profile', authMiddleware, async (req, res) => {

    try {
        await User.findByIdAndUpdate(req.userId, {
            phone: req.body.phone,
            email: req.body.email
        })

        res.redirect('/dashboard')

    } catch (error) {
        console.log(error);
    }
})

router.get('/others', authMiddleware, async (req, res) => {

    try {
        const data = await User.find();
        res.render('admin/others', { data, layout: adminLayout })
    } catch (error) {
        console.log(error);
    }
})

router.get('/log/:id', authMiddleware, async (req, res) => {

    try {
        const log = await Log.findById(req.params.id);

        res.render('admin/log', { log, layout: adminLayout })

    } catch (error) {
        console.log(error);
    }

})

router.get('/other-logs/:username', authMiddleware, async (req, res) => {

    try {
        const username = req.params.username;

        const logs = await Log.find({ username }).sort({ createdAt: -1 }).limit(50);

        res.render('admin/other-logs', { logs, username, layout: adminLayout })

    } catch (error) {
        console.log(error);
    }

})

router.post('/other-logs', authMiddleware, async (req, res) => {

    try {
        const { method, username } = req.body;

        const logs = await Log.find({ $and: [{ method }, { username }] }).sort({ createdAt: -1 }).limit(50);

        res.render('admin/other-logs', { logs, username, layout: adminLayout })

    } catch (error) {
        console.log(error);
    }

})

module.exports = router;