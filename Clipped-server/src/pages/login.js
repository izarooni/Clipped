import { nanoid } from 'nanoid';
import { error } from '../utils.js';
import * as bcrypt from 'bcrypt';
import * as User from '../models/user.js';
import * as Database from '../database.js';

const print = (s) => console.log(`[login.js] ${s}`)

function LoginHandler(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const { username, password, loginToken } = req.body;
    // console.log(username, password, loginToken);

    if (!username || (!password && !loginToken)) return error(res, 'Must enter credentials');

    if (!username.match(/^[a-zA-Z0-9-_]{3,13}$/)) {
        print('/login/: invalid credentials');
        return error(res, 'Please enter a username and password');
    }

    Database.getConnection().then((session) => {
        session
            .sql('select * from users where username = ? limit 1')
            .bind(username)
            .execute()
            .then(rs => {
                let user = rs.fetchOne();

                if (!user || !(user = User.fromArray(user))) {
                    print(`/login/: account ${username} not found`);
                    return error(res, `The account doesn't exist`);
                } else {
                    bcrypt.compare(password, user.password, (err, passwordMatch) => {
                        const tokenMatch = (loginToken && user.loginToken == loginToken);
                        const rawPasswordMatch = password == user.password && process.env.allow_raw_passwords == 'true';

                        if ((!password && tokenMatch) || (password && (passwordMatch || rawPasswordMatch))) {
                            print(`/login/: account ${user.username} found... auth success`);

                            // unncessary data
                            // don't send avatar, too much data
                            // don't send password, private information
                            delete user.avatar;
                            delete user.password;

                            if (!tokenMatch && passwordMatch) {
                                // update the user token when a new session is created
                                user.loginToken = nanoid();
                                session.sql('update users set login_token = ?, updated_at = current_timestamp where id = ?')
                                    .bind(user.loginToken, user.ID).execute()
                                    .then(() => session.close());
                            } else session.close();

                            res.end(JSON.stringify(user));
                        } else {
                            print(`/login/: account ${user.username} found... incorrect password`);
                            // print(`/login/: \t password:${password}, r_token:${loginToken}, s_token:${user.loginToken}`);
                            if (password == user.password && process.env.allow_raw_passwords != 'true') {
                                error(res, 'Server rejected password');
                            } else {
                                error(res, 'Incorrect password');
                            }
                            session.close();
                        }
                    });
                }
            });
    });
}

export default LoginHandler;