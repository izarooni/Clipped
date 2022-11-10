import * as bcrypt from 'bcrypt';
import * as User from '../models/user.js';
import * as Database from '../database.js';

const print = (s) => console.log(`[login.js] ${s}`)

function LoginHandler(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { username, password, loginToken } = req.body;

    if (!username || !username.match(/^[a-zA-Z0-9-_]{3,13}$/g)
        || !loginToken && !password || (password && password.length < 3)) {
        print('login/: invalid credentials');
        res.end(JSON.stringify({ 'error': `Invalid credentials`, 'errorCode': 1 }));
        console.log();
        return;
    }

    Database.getConnection().then((session) => {
        session
            .sql('select * from users where username = ? limit 1')
            .bind(username)
            .execute()
            .then(rs => {
                let user = rs.fetchOne();

                if (!user || !(user = User.fromArray(user))) {
                    print('login/: account not found', username);
                    res.end(JSON.stringify({ 'error': 'The account could not be found.', 'errorCode': 3 }));
                } else {
                    print('login/: account found, testing credentials');

                    bcrypt.compare(password, user.password, (err, result) => {
                        if (user.loginToken == loginToken || result) {
                            print('login/: auth success');

                            // don't send avatar which may have too much data
                            // don't send password
                            user.avatar = user.password = undefined;
                            res.end(JSON.stringify(user));

                            // update stored loginToken to the one just used
                            if (loginToken && user.loginToken != loginToken) {
                                session.sql('update users set login_token = ? where id = ?').bind(loginToken, user.ID).execute();
                                session.close();
                            } else session.close();
                        } else {
                            print(`login/: incorrect password: ${err}. ${password}_${user.password}`);
                            res.end(JSON.stringify({ 'error': `Invalid credentials`, 'errorCode': 2 }));
                            session.close();
                        }
                    });
                }

                console.log();
            });
    });

    console.log();
}

export default LoginHandler;