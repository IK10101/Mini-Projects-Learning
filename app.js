const express = require('express');
const app = express();
const User = require('./models/user');
const Post = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/myapp');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        let { email, password, name, username, age } = req.body;

        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).send("User already registered");
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                let user = await User.create({
                    name,
                    username,
                    email,
                    age,
                    password: hash,
                    posts: []
                });

                let token = jwt.sign(
                    { email: email, userid: user._id },
                    "secret"
                );

                res.cookie("token", token);
                res.send("User registered successfully");
            });
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;

    let user = await User.findOne({ email });

    
    if (!user) {
        return res.status(400).send("User not found");
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            
            let token = jwt.sign(
                { email: user.email, userid: user._id },
                "secret"
            );

            res.cookie("token", token);
            res.redirect("/profile")
        } else {
            res.redirect("/login");
        }
    });
});

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        let user = await User.findById(req.user.userid)
            .populate("posts");

        res.render("profile", { user });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post('/post', isLoggedIn, async (req, res) => {
    let user = await User.findById(req.user.userid);

    let post = await Post.create({
        content: req.body.content,
        user: user._id
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect('/profile');
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await Post.findById(req.params.id);

    let liked = post.likes.some(
        like => like.toString() === req.user.userid
    );

    if (liked) {
        post.likes.pull(req.user.userid);
    } else {
        post.likes.push(req.user.userid);
    }

    await post.save();
    res.redirect('/profile');
});

app.post('/delete/:id', isLoggedIn, async (req, res) => {

    let post = await Post.findById(req.params.id);

    if (post.user.toString() !== req.user.userid) {
        return res.status(403).send("Unauthorized");
    }

    await User.findByIdAndUpdate(
        req.user.userid,
        { $pull: { posts: req.params.id } }
    );

    await Post.findByIdAndDelete(req.params.id);

    res.redirect('/profile');
});

app.post('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await Post.findById(req.params.id);

    if (post.user.toString() !== req.user.userid) {
        return res.status(403).send("Unauthorized");
    }

    post.content = req.body.content;
    await post.save();

    res.redirect('/profile');
});

function isLoggedIn(req, res, next) {
    
    if (!req.cookies.token) {
        res.send("You must be Logged in")
        return res.redirect("/login");
    }

    try {
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
        next();
    } catch (err) {
        res.redirect("/login");
    }
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});