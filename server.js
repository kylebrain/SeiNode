var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var session = require('express-session');
//var path = require('path');

app.use(cookieParser());
var sess = {
    secret: 'Dont tell anyone this!',
    cookie: {
        maxAge: 604800000,
    },
    resave: true,
    saveUninitialized: false
};

if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess));
app.use(express.static(__dirname + '/public'));

const PORT = process.env.PORT || 3000;

const sqlite3 = require('sqlite3');
let db = new sqlite3.Database('./seinQLDatabase.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('>>>> Connected to the seinQL database. <<<<');
});

app.get('/uid', (req, res) => {
    if (req.session.uid) {
        console.log('Found user: ' + req.session.uid);
        res.send(req.session.uid.toString());
    } else {
        db.get("SELECT MAX(id) AS max FROM users", (err, row) => {
            req.session.uid = row.max + 1;
            db.run("INSERT INTO users (id, username, pass, tempuser) VALUES (?, ?, NULL, 1)", req.session.uid, 'tempuser0' + req.session.uid, (err) => {
                if (err) console.log(err);
                console.log('Created user: ' + req.session.uid);
                res.send(req.session.uid.toString());
            });
        });
    }
});

app.get('/getuserinfo/', (req, res) => {
    db.get("SELECT username, tempuser FROM users WHERE id = ?", req.session.uid, (err, row) => {
        if (row) {
            res.send(row);
        } else {
            res.status(404).send();
        }
    });
});

app.get('/shows', (req, res) => {
    db.all("SELECT * FROM shows", (err, rows) => {
        res.send(rows);
    });
});

app.get('/random', (req, res) => {
    db.get("SELECT * FROM shows WHERE id NOT IN (SELECT showid FROM watched WHERE userid = ?) ORDER BY RANDOM()", req.session.uid, (err, row) => {
        res.send(row);
    });
});

app.post('/watch/:sid', (req, res) => {
    let uid = req.session.uid;
    let sid = req.params.sid;
    db.get("SELECT * FROM watched WHERE userid = ? AND showid = ?", uid, sid, (err, row) => {
        if (row) {
            db.run("DELETE FROM watched WHERE userid = ? AND showid = ?", uid, sid, (err) => {
                if (err) console.log(err);
                console.log('Removed episode from watched!');
                res.status(204).send(false);
            });
        } else {
            db.run("INSERT INTO watched (userid, showid) VALUES (?, ?)", uid, sid, (err) => {
                if (err) console.log(err);
                console.log('Added episode to watched!');
                res.status(201).send(true);
            });
        }
    });
});

app.get('/watched', (req, res) => {
    db.all("SELECT * FROM watched JOIN shows ON watched.showid = shows.id WHERE userid = ? ORDER BY watched.showid", req.session.uid, (err, rows) => {
        if (err) console.log(err);
        res.send(rows);
    });
});

app.get('/clear', (req, res) => {
    db.run("DELETE FROM watched WHERE userid = ?", req.session.uid, (err) => {
        res.status(200).send();
    });
});

//login

app.get('/uid/:user/:pass', (req, res) => {
    db.get("SELECT id FROM users WHERE username = ? AND pass = ?", req.params.user, req.params.pass, (err, rowUser) => {
        if (rowUser) {
            console.log('Found ID');

            /* admin page */
            /*if (rowUser.id == 1) {
                res.sendFile(__dirname + '/admin/admin.html');
                return;
            } */

            db.get("SELECT COUNT(*) AS count FROM watched WHERE userid = ?", req.session.uid, (err, row) => {
                if (err) console.log(err);
                if (row.count == 0) {
                    db.run("DELETE FROM users WHERE id = ? AND tempuser = 1", req.session.uid, (err) => {
                        if (err) console.log(err);
                    });
                }
                req.session.uid = rowUser.id;
                res.send(req.session.uid.toString());
            });
        } else {
            console.log('Couldn\'t find ID');
            res.status(404).send();
        }
    });
});

//signup

app.post('/newuser/:user/:pass', (req, res) => {
    db.get("SELECT tempuser FROM users WHERE id = ?", req.session.uid, (err, row) => {
        if (row.tempuser) {
            db.run("UPDATE users SET username = ?, pass = ?, tempuser = 0 WHERE id = ?", req.params.user, req.params.pass, req.session.uid, (err) => {
                if (err) {
                    res.status(400).send();
                    return;
                }
                res.status(201).send();
            });
        } else {
            db.run("INSERT INTO users (id, username, pass, tempuser) VALUES (NULL, ?, ?, 0)", req.params.user, req.params.pass, (err) => {
                if (err) {
                    console.log(err);
                    res.status(400).send();
                    return;
                }
                db.get("SELECT MAX(id) AS max FROM users", (err, row) => {
                    req.session.uid = row.max;
                    console.log('Created user: ' + req.session.uid);
                    res.send(req.session.uid.toString());
                });
            });
        }
    });
});

//delete user

app.delete('/deluser', (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", req.session.uid, (err) => {
        if (err) {
            console.log(err);
            res.status(400).send();
        }
        db.run("DELETE FROM watched WHERE userid = ?", req.session.uid, (err) => {
            if (err) {
                console.log(err);
                res.status(400).send();
            }
            req.session.destroy();
            res.status(204).send();
        });
    });

});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send();
});

//TODO: Change to delete and adding an admin page after pushing to production

app.get('/deletetemp/:user/:pass', (req, res) => {
    if (req.params.user == 'admin' && req.params.pass == 'noSoup4you!') {
        console.log('DELETING TEMP!');
        db.each("SELECT * FROM users WHERE tempuser = 1", (err, row) => {
            db.run("DELETE FROM watched WHERE userid = ?", row.id, (err) => {
                if (err) console.log(err);
            });
            db.run("DELETE FROM users WHERE id = ?", row.id, (err) => {
                if (err) console.log(err);
            });
        },
            (err) => {
                if (err) console.log(err);
                req.session.destroy();
                console.log('Deleted Temp!');
                res.send('DELETED TEMP!');
            });
    } else {
        res.status(400).send();
    }
});

app.listen(PORT, () => {
    console.log(">>>> Listening on port " + PORT + ". <<<<");
});