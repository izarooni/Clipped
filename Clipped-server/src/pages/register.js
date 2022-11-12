import { nanoid } from 'nanoid';
import { error } from '../utils.js';

import * as bcrypt from 'bcrypt';
import * as Database from '../database.js';
import * as User from '../models/user.js';

function print(s, ...args) {
    console.log(`[database.js] ${s}`, ...args);
}

export default function RegisterPage(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { username, password } = req.body;

    if (!username.match(/^[a-zA-Z0-9-_]{3,13}$/g) || !password || password.length < 4) {
        res.write(JSON.stringify({ 'error': 'Must enter a username and password' }));
        res.end();
    }

    const user = User.fromObject({
        displayName: username,
        username: username,
        password: password,
        loginToken: nanoid(),
        createdAt: Date.now(),
    });

    Database.getConnection().then((session) => {
        session.sql('select * from users where username = ? limit 1').bind(username).execute().then(async (rs) => {
            let row = rs.fetchOne();
            if (row) {
                const found = User.fromArray(row);

                // someone registered with the same name 
                // so for fun, if the password is the same just log them in
                let result = await bcrypt.compare(password, found.password);
                if (!result) return error(res, 'The username is being used');

                // unncessary data
                // don't send avatar, too much data
                // don't send password, private information
                delete found.avatar;
                delete found.password;
                if (!found.loginToken) {
                    // update the user token when a new session is created
                    found.loginToken = nanoid();
                    session.sql('update users set login_token = ?, updated_at = current_timestamp where id = ?')
                        .bind(found.loginToken, found.ID).execute()
                        .then(() => session.close());
                }

                res.end(JSON.stringify({
                    'success': 'Bro just login like a normal person',
                    'user': found
                }));
                return;
            }

            bcrypt.hash(password, 10, (err, hash) => {
                session.sql(`
                    insert into users (display_name, username, \`password\`)
                    values (?, ?, ?)`
                ).bind(username, username, hash).execute().then((rs2) => {
                    session.close();

                    let accountID = rs2.getAutoIncrementValue();
                    if (!accountID) return error(res, 'Unknown error');

                    res.end(JSON.stringify({
                        'success': 'Account created',
                        'user': user
                    }));
                });
            });
        })
    });
}